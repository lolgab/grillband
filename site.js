// Grill Band e le Calabriselle: shared page script. Every block checks that its elements exist,
// so the same file serves the home page and /calabriselle/.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal once when an element enters the viewport. Never replays, never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// Signature move: the hero photograph slowly crossfades through the band's pictures.
(() => {
  const box = document.querySelector('[data-crossfade]');
  if (!box || reduceMotion) return;
  const imgs = [...box.querySelectorAll('img')];
  if (imgs.length < 2) return;
  let i = 0;
  let timer = null;
  const next = () => {
    const n = (i + 1) % imgs.length;
    const show = () => { imgs[i].classList.remove('is-on'); imgs[n].classList.add('is-on'); i = n; };
    if (imgs[n].complete) show(); else imgs[n].addEventListener('load', show, { once: true });
  };
  const start = () => { if (!timer) timer = setInterval(next, 6000); };
  const stop = () => { clearInterval(timer); timer = null; };
  imgs.slice(1).forEach((img) => { img.loading = 'eager'; });
  start();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();

// Upcoming dates: each <li data-date="YYYY-MM-DD"> hides itself the day after the event.
(() => {
  const list = document.querySelector('[data-upcoming]');
  if (!list) return;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let shown = 0;
  list.querySelectorAll('li[data-date]').forEach((li) => {
    if (li.dataset.date < todayKey) li.remove(); else shown++;
  });
  const empty = list.querySelector('.is-empty');
  if (empty) empty.hidden = shown > 0;
})();

// Preventivo form helpers: prefill fields and jump to the form.
const quoteForm = document.getElementById('preventivo-form');
function prefillQuote(values) {
  if (!quoteForm) return;
  for (const [name, value] of Object.entries(values)) {
    const field = quoteForm.elements[name];
    if (field && value) field.value = value;
  }
}
(() => {
  // /?formula=itinerante#preventivo (used by the Calabriselle page)
  const params = new URLSearchParams(location.search);
  prefillQuote({ formula: params.get('formula'), luogo: params.get('luogo'), data_evento: params.get('data') });
})();

// The live thing: "La tua festa" prints the visitor's own line in the programme.
(() => {
  const form = document.getElementById('yours');
  const result = document.getElementById('yours-result');
  if (!form || !result) return;
  const list = result.querySelector('ul');
  const go = document.getElementById('yours-go');
  const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const paese = form.elements.paese.value.trim();
    const data = form.elements.data.value;
    if (!paese) { form.elements.paese.focus(); return; }
    const when = data ? fmt.format(new Date(`${data}T12:00:00`)) : 'Data da fissare';
    const li = document.createElement('li');
    li.className = 'is-yours';
    const what = document.createElement('span');
    what.className = 'what';
    what.textContent = paese;
    const small = document.createElement('small');
    small.textContent = 'La tua festa, con la Grill Band e le Calabriselle';
    what.appendChild(small);
    const whenEl = document.createElement('span');
    whenEl.className = 'when';
    whenEl.textContent = when;
    li.append(what, whenEl);
    list.replaceChildren(li);
    result.hidden = false;
    go.onclick = () => prefillQuote({ luogo: paese, data_evento: data });
  });
})();

// Formula tabs: switch panel and photograph, keyboard arrows supported.
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;
  const img = document.getElementById('show-img');
  const go = document.getElementById('show-go');
  let current = tabs[0];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (img && tab.dataset.img) {
      img.src = tab.dataset.img;
      img.alt = tab.dataset.alt || '';
      img.style.objectPosition = tab.dataset.pos || '50% 50%';
    }
    current = tab;
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(tabs[n], true);
      }
    });
  });
  if (go) go.addEventListener('click', () => prefillQuote({ formula: current.dataset.formula }));
})();

// Gallery lightbox with previous / next and keyboard.
(() => {
  const box = document.getElementById('lightbox');
  const buttons = [...document.querySelectorAll('[data-full]')];
  if (!box || !buttons.length) return;
  const img = box.querySelector('img');
  let idx = 0;
  let opener = null;
  const show = (i) => {
    idx = (i + buttons.length) % buttons.length;
    img.src = buttons[idx].dataset.full;
    img.alt = buttons[idx].querySelector('img').alt;
  };
  const open = (i) => { opener = buttons[i]; show(i); box.hidden = false; box.querySelector('.lb-close').focus(); };
  const close = () => { box.hidden = true; if (opener) opener.focus(); };
  buttons.forEach((b, i) => b.addEventListener('click', () => open(i)));
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

// LaC TV embeds load only when clicked.
document.querySelectorAll('.tv[data-embed]').forEach((tv) => {
  const btn = tv.querySelector('button');
  btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = tv.dataset.embed;
    iframe.title = btn.getAttribute('aria-label') || 'Video';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    btn.replaceWith(iframe);
  });
});

// Listen button: plays and pauses "Tarantula".
(() => {
  const box = document.getElementById('listen');
  if (!box) return;
  const btn = box.querySelector('button');
  const label = btn.querySelector('span');
  const audio = box.querySelector('audio');
  const time = box.querySelector('.listen__time');
  const icon = btn.querySelector('path');
  const PLAY = 'M3 1.5v13L14 8z';
  const PAUSE = 'M3 2h3.5v12H3zM9.5 2H13v12H9.5z';
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  btn.addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  audio.addEventListener('play', () => { btn.setAttribute('aria-pressed', 'true'); label.textContent = 'Pausa'; icon.setAttribute('d', PAUSE); });
  audio.addEventListener('pause', () => { btn.setAttribute('aria-pressed', 'false'); label.textContent = 'Ascolta «Tarantula»'; icon.setAttribute('d', PLAY); });
  audio.addEventListener('timeupdate', () => { time.textContent = mmss(audio.currentTime); });
  audio.addEventListener('ended', () => { time.textContent = ''; });
})();

// Quote form: posts to the Worker (/api/preventivo) with the Turnstile token.
(() => {
  if (!quoteForm) return;
  const status = document.getElementById('preventivo-status');
  const submit = document.querySelector('button[form="preventivo-form"]');
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(quoteForm);
    if (!data.get('telefono') && !data.get('email')) {
      status.textContent = 'Inserisci almeno un telefono o un’email.';
      status.className = 'quote__status error';
      quoteForm.elements.telefono.focus();
      return;
    }
    submit.disabled = true;
    status.textContent = 'Invio in corso…';
    status.className = 'quote__status';
    try {
      const res = await fetch('/api/preventivo', { method: 'POST', body: data });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        quoteForm.reset();
        status.textContent = 'Richiesta inviata. Ti ricontatteremo al più presto.';
        status.className = 'quote__status success';
      } else {
        status.textContent = out.error || 'Errore durante l’invio. Riprova o chiamaci.';
        status.className = 'quote__status error';
      }
    } catch {
      status.textContent = 'Errore di rete. Riprova o chiamaci.';
      status.className = 'quote__status error';
    }
    if (window.turnstile) window.turnstile.reset();
    submit.disabled = false;
  });
})();
