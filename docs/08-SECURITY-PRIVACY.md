# Security, safety & privacy

## Threat model
- Client tampering: mission awards can be falsified locally; acceptable for guest demo but never claim authoritative grades.
- AI prompt injection: learner text should be treated as untrusted data; model may only advise, not mutate state or access tools.
- Secrets: server-side model key only, `.env` ignored, `.env.example` tracked with placeholders.
- Malicious large circuit payload: limit graph size, request body length, solve time, validate types and finite numbers.
- Third-party assets: track attribution/license; never copy copyrighted characters or audio.
- Child privacy: no collection of names, emails, geolocation, photos, voice recordings, or personal chat logs in MVP.

## Minimum controls
CSP suitable for deployed assets, HTTPS, dependency audit, strict CORS for tutor gateway, server-side rate limit, API token rotation instructions, structured logs without learner prompts or identifiers. If a cloud model is not available, use the transparent local fallback.

## Safety copy
"This is a simplified simulation. Never experiment with wall power or real electrical outlets." Avoid presenting circuit values as instructions for real-world wiring.

## Data rights
Guest progress local only; clear data control and privacy explanation. If analytics added later, prefer aggregate opt-in telemetry and review requirements for child-directed services by jurisdiction.

## Live tutor function (2026-11-16)
`/api/hint` keeps the provider key in Vercel environment variables only (`TUTOR_API_KEY`, never `VITE_`), takes only the bounded `TutorContext` and a question of at most 200 characters, re-screens the question, checks the Origin allowlist, applies an 8 KiB body cap and a best-effort in-memory per-IP rate limit, aborts the provider call after 8 s, validates the reply, never logs prompts or contexts, and never echoes provider errors. `Content-Security-Policy: connect-src 'self'` stops the page from sending data to any other host. Not covered: spend limits (set one with the provider), a shared rate limit across instances, provider-side data handling and retention (review the chosen provider's terms before enabling it for children).
