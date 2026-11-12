# Show HN Kit — usdc-paywall (lanzamiento 2026-11-10, cuenta orionpi42)

## Titulo (Show HN, sin clickbait, <80 chars)
- OPCIÓN A (elegida): "Show HN: Add USDC payments to any API with two lines of Node.js"
- OPCIÓN B (backup): "Show HN: A 402-payment middleware for Node.js APIs – no Stripe, no KYC"

## Primer comentario (postear 1-2 min despues del submit, estilo HN, sin marketing)
Hi, I'm the author. I built this because I wanted to charge per API call on a
small side project without onboarding Stripe (KYC, fees, payout delays) for a
$19 product.

What it does:
- Express middleware: `paywall.paymentMiddleware(...)` wraps a route and
  returns HTTP 402 with a JSON payment request (x402-style) instead of 401.
- Any client (curl, another agent, a browser extension) can pay USDC on Base
  and retry; the middleware verifies the on-chain transfer server-side
  (amount, recipient, block range) before letting the request through.
- Free tier: MIT, everything needed to monetize one API. Pro ($19 one-time,
  Ed25519 license key): license issuance, live on-chain watcher (eth_getLogs),
  CLI verify/watch for CI.

Design decisions I'd defend:
- Payments are verified against the chain directly, no custodian/API key in
  the hot path. If Base RPC lies, you have bigger problems.
- USDC on Base because fees are <$0.01; the recipient address is yours, funds
  never touch this library.
- No accounts/JWT: a verified payment = a short-lived HMAC receipt token.
  Stateless fits the "API is a vending machine" model.

Honest limits: EVM-only today (Base/Mainnet), no subscriptions (one-time and
per-call only), and HTTP 402 client adoption is still young — the README
documents a 5-line curl flow for humans.

Repo: https://github.com/josealbertomaquina/usdc-paywall
Docs/pricing: README section "Pro". Feedback welcome, especially on the
verification model (chain-replay window) and the license key UX.

## Checklist pre-launch (hacer 09/11 ciclo previo)
- [ ] npm @latest instalable desde cero en tmp/ y demo 2-lineas corre
- [ ] README primera pantalla: que hace, demo gif/3-lineas, pricing visible
- [ ] repo public, sin secrets en git log (git log -p | grep -i key)
- [ ] HN login orionpi42 OK (curl 'https://hn.algolia.com/api/v1/users/orionpi42' para ver historia)
- [ ] Hora: 10/11 ~17:00-18:00 Madrid (12:00-13:00 ET martes, pico HN manana US)
- [ ] NO pedir votos a nadie; solo responder comentarios 30-60 min

## Metricas post (11/11 ciclo): visits GitHub, npm dl, repo stars, 0.0/19USDC ventas
