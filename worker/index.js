const FORMULE = new Set(["concerto", "itinerante", "concerto+itinerante", "altro"]);

const LIMITS = {
  nome: 100,
  telefono: 30,
  email: 120,
  data_evento: 10,
  luogo: 150,
  formula: 30,
  messaggio: 2000,
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const outcome = await res.json();
  return outcome.success === true;
}

function encodeHeader(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

async function notify(env, r) {
  if (!env.NOTIFY || !env.NOTIFY_FROM || !env.NOTIFY_TO) return;
  const { EmailMessage } = await import("cloudflare:email");
  const text = [
    `Nome: ${r.nome}`,
    `Telefono: ${r.telefono || "-"}`,
    `Email: ${r.email || "-"}`,
    `Data evento: ${r.data_evento || "-"}`,
    `Luogo: ${r.luogo}`,
    `Formula: ${r.formula || "-"}`,
    "",
    r.messaggio || "",
  ].join("\r\n");
  // Replying goes to the requester, not to the notifiche.grillband.it sender (no mailbox).
  // r.email is validated without whitespace, so it cannot inject headers.
  const replyTo = r.email ? [`Reply-To: ${encodeHeader(r.nome)} <${r.email}>`] : [];
  const raw = [
    `From: Sito Grill Band <${env.NOTIFY_FROM}>`,
    `To: ${env.NOTIFY_TO}`,
    ...replyTo,
    `Subject: ${encodeHeader(`Richiesta preventivo: ${r.luogo}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@grillband.it>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
  ].join("\r\n");
  await env.NOTIFY.send(new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, raw));
}

async function handlePreventivo(request, env, ctx) {
  const ip = request.headers.get("cf-connecting-ip") || "";

  const { success } = await env.FORM_LIMITER.limit({ key: ip || "unknown" });
  if (!success) return json({ ok: false, error: "Troppe richieste, riprova tra un minuto." }, 429);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Richiesta non valida." }, 400);
  }

  // Honeypot field: real users never fill it.
  if (form.get("website")) return json({ ok: true });

  const ok = await verifyTurnstile(form.get("cf-turnstile-response"), ip, env.TURNSTILE_SECRET);
  if (!ok) return json({ ok: false, error: "Verifica anti-spam fallita, ricarica la pagina e riprova." }, 403);

  const r = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    const v = (form.get(field) || "").toString().trim();
    if (v.length > max) return json({ ok: false, error: `Campo "${field}" troppo lungo.` }, 400);
    r[field] = v;
  }

  if (!r.nome || !r.luogo) return json({ ok: false, error: "Nome e luogo sono obbligatori." }, 400);
  if (!r.telefono && !r.email) return json({ ok: false, error: "Inserisci almeno telefono o email." }, 400);
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return json({ ok: false, error: "Email non valida." }, 400);
  if (r.data_evento && !/^\d{4}-\d{2}-\d{2}$/.test(r.data_evento)) return json({ ok: false, error: "Data non valida." }, 400);
  if (r.formula && !FORMULE.has(r.formula)) r.formula = "altro";

  await env.DB.prepare(
    `INSERT INTO preventivi (nome, telefono, email, data_evento, luogo, formula, messaggio, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(r.nome, r.telefono, r.email, r.data_evento, r.luogo, r.formula, r.messaggio, ip)
    .run();

  ctx.waitUntil(notify(env, r).catch((e) => console.error("notify failed", e)));

  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/preventivo") {
      if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
      return handlePreventivo(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "Not found" }, 404);

    return env.ASSETS.fetch(request);
  },
};
