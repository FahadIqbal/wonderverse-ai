# WonderVerse AI: Electricity Lab

Kiroween 2026 entry, **Frankenstein** category. It combines four parts into one learning tool for ages 10 to 14:

- an interactive 3D bench (with an accessible schematic alternative) for wiring a battery, switch and lamps,
- a deterministic DC circuit solver that computes every voltage, current and lamp state,
- a three-mission state machine (progress is saved in the browser only),
- a tutor that explains the computed state: an offline local guide by default, and an optional live AI tutor (a Vercel function) that the site owner can turn on with an API key.

Live demo: https://wonderverse-ai.vercel.app (hosted on Vercel, no login). Source: https://github.com/FahadIqbal/wonderverse-ai

## Status

Tasks T01 to T12 are done (scaffold, circuit schemas, solver, UI, 3D lab, three missions, persistence, tutor, accessibility pass, Playwright E2E and CI). T13 (deploy and anonymous test) is done. A visual polish pass (self-hosted fonts, observatory portal, mission cards, feedback motion, richer 3D materials) and a small report-driven lamp pulse in the 3D view (off under reduced motion and Low-power) followed (`docs/12`, `docs/18`). A final pass moved the lab to the top of the mission page (`docs/12`, `docs/18`). A closing pass (2026-11-15) added emulation checks (forced colors, reduced motion, zoom/reflow viewports, keyboard-only mission 1), opt-in Firefox and WebKit engine runs, a licence audit and an E2E warm-up (`docs/18`). T14 (Kiro record, video, Devpost) is partly prepared; the video, YouTube upload and Devpost submission are not done. Test results, with exact counts and what was not tested, are in `docs/18-QA-RESULTS.md`. Decisions are in `docs/12-DECISION-LOG.md`.

## Run it

Requires Node 20 or newer.

```bash
npm install
npm run dev          # dev server
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build
```

## Test it

```bash
npx tsc -b                 # typecheck
npm run lint
npm run test:run           # unit and property tests (Vitest, fast-check)
npm run typecheck:e2e
npx playwright install chromium   # once, if you have no Chrome
npm run e2e                # Playwright; builds the app and serves it on port 4173
npm run e2e:ci             # same, with the CI settings (bundled Chromium)
npx playwright install firefox webkit && E2E_CROSS=1 npm run e2e -- --project=firefox --project=webkit   # optional engine-level runs
```

To run the E2E suite against an already deployed site, set `E2E_BASE_URL` (see `playwright.config.ts`).

## Tutor: Local guide by default, optional live AI tutor
The app works with no key and no backend. The tutor then uses the built-in **Local guide**, labelled as such in the UI. A live AI tutor is available **only if the site owner configures a key**; none is configured in this repository, and nothing has been run against a real provider yet.

How it works: the browser sends only the bounded `TutorContext` built from the solver report (and an optional question of at most 200 characters) to the same-origin function `POST /api/hint` (`server/tutor/`, bundled to `api/hint.js`). The function checks origin, rate, size and schema, re-screens the question, calls the chosen provider with `fetch` (OpenAI, Anthropic, Google Gemini or OpenRouter), validates the reply and returns `{text, source: 'ai'}`. The browser validates the reply again (numbers must come from the circuit report; no links, markup, mains or "mission complete" claims). Any failure shows the Local guide, labelled "Local guide · offline hint". Questions about wall power, other off-topic text and prompt-injection attempts never leave the browser.

**Turn it on (site owner, Vercel):** open the project in Vercel, go to Settings > Environment Variables, and add these for **Production**, then redeploy (Deployments > Redeploy). The key is server-only and is never sent to the browser or committed.
1. `TUTOR_PROVIDER` = `openai`, `anthropic`, `gemini` or `openrouter`
2. `TUTOR_MODEL` = a model id from that provider's own model list (there is no default on purpose)
3. `TUTOR_API_KEY` = the provider key (set a spend limit with the provider too)

Optional: `TUTOR_ALLOWED_ORIGINS` (comma-separated exact origins; default is only `https://wonderverse-ai.vercel.app`, so preview URLs need adding), `TUTOR_RATE_LIMIT` (per minute per IP per instance, default 20). The build switches the browser to the AI path when `TUTOR_API_KEY` is present in the build environment (`vite.config.ts`; only the word `remote` is embedded, never the key). To turn it off, remove the variables and redeploy. Details and the limits of the in-memory rate limit are in `docs/12-DECISION-LOG.md`.

`api/hint.js` is generated from `server/tutor/` by `npm run build:api` (run by `npm run build`; a test fails if the committed file is stale). The older FastAPI gateway in `services/tutor` is kept and tested but is secondary; `VITE_TUTOR_URL` still points the browser at it. Never commit a real key; `.env*` files other than the `.env.example` templates are git-ignored.
## Limitations

- The solver models **simplified DC circuits** (ideal battery, resistive lamps, switches). It is a teaching model, not a general circuit simulator.
- Nothing here is real electrical safety advice. The tutor refuses mains and outlet topics and must not be used as a guide for working with real electricity.
- The live AI tutor works only if the owner adds a provider key in Vercel. Until then, and whenever it fails or its reply is rejected, answers come from the Local guide. The AI path has been tested with mocked provider responses only, not against a live provider. AI replies can be wrong; the circuit report is the source of truth.
- Testing used Playwright **emulation** (desktop, tablet, mobile viewports) on software WebGL. Playwright's Firefox and WebKit builds ran the same suite once (opt-in, engine-level, not Firefox or Safari releases), plus forced-colors, reduced-motion and zoom-sized viewport emulation. There was no real-device, real-GPU, screen-reader, or real Safari/Firefox testing. See `docs/17-MANUAL-QA-CHECKLIST.md`.
- Progress is stored in the browser's localStorage only. There are no accounts.

## Submission materials
- `submission/DEVPOST-SUBMISSION-FINAL.md`: Devpost text (has a `[TODO: YouTube URL]` placeholder).
- `submission/DEMO-SCRIPT-FINAL.md`: timed demo script and pre-recording checklist. The video is not recorded yet.
- `submission/COMPLIANCE-CHECKLIST.md`: per-item status, with the steps only a human can do.
- `submission/screenshots/`: screenshots of the polished UI (desktop 1440x900 and mobile 390x844, plus reduced-motion variants of the schematic), captured from the live site (https://wonderverse-ai.vercel.app) in clean browser contexts.
- `docs/19-KIRO-USAGE-RECORD.md`: what the repo shows about Kiro use, and what it cannot show.
- `submission/ASSET-AND-LICENSE-REGISTER.md`: assets and licenses from repo evidence, with unverified items marked.

## Event-window disclosure

`AGENTS.md` requires that no WonderVerse code built before October 30, 2026 is reused for this competition without disclosure, and that the implementation is built fresh within the event window. The commit history in this repository and `docs/12-DECISION-LOG.md` record the build. The reuse and asset register is in `submission/ASSET-AND-LICENSE-REGISTER.md`.

## Repository map

- `src/`: app (`app`, `features`, `domain`, `ui`). The solver in `src/domain/circuit` is pure and has no rendering imports.
- `e2e/`: Playwright specs. `services/tutor/`: older optional FastAPI gateway. `server/tutor/` and `api/`: the Vercel tutor function (source and generated bundle).
- `docs/`: product, architecture, simulation, QA and decision records. `submission/`: competition checklist and drafts. `prompts/`: agent prompts.
- `.kiro/`: Kiro steering and specs (tracked on purpose).

## License

MIT. See `LICENSE`.
