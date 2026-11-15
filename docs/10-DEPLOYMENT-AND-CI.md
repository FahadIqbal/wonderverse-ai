# Deployment & operations

## Local commands (target after code exists)
`npm install`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. If backend exists, `cd services/tutor && uvicorn main:app --reload` with Python venv and environment variables.

## Deployment strategy
Static frontend on Vercel/Cloudflare Pages/AWS Amplify; optional small tutor service on a provider supporting secret env vars and HTTPS. Never make model access mandatory for judges. Configure SPA routing fallback and cache immutable hashed assets. Add explicit `VITE_TUTOR_ENABLED` feature flag.

## CI proposal
GitHub Actions on PR/push: Node LTS; install from lockfile; lint; typecheck; tests; build; Playwright smoke (where supported). Fail on `.env` committed or hidden `.kiro` omitted. Include dependency/license scans.

## Operational checks
- Deployed home page loads on clean browser.
- 3D and 2D fallback both work.
- Refresh restores mission progress.
- Missing model key shows fallback hints.
- `robots` and analytics comply with data policy.
- Public README includes reproducible steps and known limitations.

## Environment example
`VITE_TUTOR_ENABLED=false`; server `MODEL_PROVIDER=...`, `MODEL_API_KEY=...`, `ALLOWED_ORIGIN=...`. Do not hardcode a provider until confirming costs, models and availability. Keep secrets out of frontend bundles and demo video.
