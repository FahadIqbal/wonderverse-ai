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
