# Cloudflare (Workers + D1 + Turnstile)

Free plan, no credit card: over the limits the API returns errors, nothing is billed.

## Local dev

```sh
npm install
npx wrangler d1 migrations apply grillband --local
npm run dev          # http://localhost:8787
```

`.dev.vars` holds the Turnstile test secret (always passes). The real site key in
`index.html` does not work on localhost: to test the form locally, temporarily set
`data-sitekey="1x00000000000000000000AA"` (don't commit it).

## Deploy

Every push to `main` is deployed automatically by Workers Builds (Cloudflare dashboard ->
Workers & Pages -> grillband -> Settings -> Builds). Manual deploy: `npm run deploy`.
D1 migrations are not automatic: `npx wrangler d1 migrations apply grillband --remote`.

## Setup (already done)

- D1 database `grillband`, id in `wrangler.jsonc`.
- Turnstile widget `grillband-preventivo` (domain `grillband.it`); site key in `index.html`,
  secret set with `npx wrangler secret put TURNSTILE_SECRET`.
- Zone `grillband.it` on Cloudflare (nameservers coen/desi). Apex records are proxied, the
  Worker route `grillband.it/*` serves the site. Mail records (Aruba) are DNS only.

## Reading requests

```sh
npx wrangler d1 execute grillband --remote --command "SELECT * FROM preventivi ORDER BY id DESC"
```

## Email notification

Each new request is emailed to `NOTIFY_TO` (see `wrangler.jsonc`) via the `send_email`
binding. Email Routing is enabled only on `notifiche.grillband.it` (its own MX/SPF), so the
Aruba mail on `grillband.it` keeps working. A new recipient must first be added and
verified as an Email Routing destination address.

## www redirect

`www-redirect/` is a separate Worker (`grillband-www`, custom domain `www.grillband.it`) that
301-redirects to `https://grillband.it`. Not deployed by Workers Builds; deploy manually:
`cd www-redirect && npx wrangler deploy`.
