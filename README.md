# WonderVerse AI: Electricity Lab

Kiroween 2026 entry, **Frankenstein** category. It combines four parts into one learning tool for ages 10 to 14:

- an interactive 3D bench (with an accessible schematic alternative) for wiring a battery, switch and lamps,
- a deterministic DC circuit solver that computes every voltage, current and lamp state,
- a three-mission state machine (progress is saved in the browser only),
- a tutor that explains the computed state, with an offline local guide and an optional gateway.

Live demo: not deployed yet. This line is updated once a URL has been verified.

## Status

Tasks T01 to T12 are done (scaffold, circuit schemas, solver, UI, 3D lab, three missions, persistence, tutor, accessibility pass, Playwright E2E and CI). T13 (deploy and anonymous test) is in progress. Test results, with exact counts and what was not tested, are in `docs/18-QA-RESULTS.md`. Decisions are in `docs/12-DECISION-LOG.md`.

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
```

To run the E2E suite against an already deployed site, set `E2E_BASE_URL` (see `playwright.config.ts`).

## Optional tutor gateway

The app works with no key and no backend. The tutor then uses the built-in **Local guide**, which is labelled as such in the UI. `services/tutor` is an optional FastAPI gateway (rate limit, body limit, CORS allowlist, output validation). Setup is in `services/tutor/README.md`. Set `VITE_TUTOR_URL` (see `.env.example`) to point the app at it. **No model provider is wired.** The gateway ships with a placeholder provider that answers 503, so the app always falls back to the Local guide until someone adds a provider. Never commit a real key; `.env*` files other than the `.env.example` templates are git-ignored.

## Limitations

- The solver models **simplified DC circuits** (ideal battery, resistive lamps, switches). It is a teaching model, not a general circuit simulator.
- Nothing here is real electrical safety advice. The tutor refuses mains and outlet topics and must not be used as a guide for working with real electricity.
- No AI model provider is connected. Tutor answers come from the local guide.
- Testing used Playwright **emulation** (desktop, tablet, mobile viewports) on software WebGL. There was no real-device, real-GPU, screen-reader, Firefox or Safari testing. See `docs/17-MANUAL-QA-CHECKLIST.md`.
- Progress is stored in the browser's localStorage only. There are no accounts.

## Event-window disclosure

`AGENTS.md` requires that no WonderVerse code built before October 30, 2026 is reused for this competition without disclosure, and that the implementation is built fresh within the event window. The commit history in this repository and `docs/12-DECISION-LOG.md` record the build. The reuse and asset register is in `submission/ASSET-AND-LICENSE-REGISTER.md`.

## Repository map

- `src/`: app (`app`, `features`, `domain`, `ui`). The solver in `src/domain/circuit` is pure and has no rendering imports.
- `e2e/`: Playwright specs. `services/tutor/`: optional gateway.
- `docs/`: product, architecture, simulation, QA and decision records. `submission/`: competition checklist and drafts. `prompts/`: agent prompts.
- `.kiro/`: Kiro steering and specs (tracked on purpose).

## License

MIT. See `LICENSE`.
