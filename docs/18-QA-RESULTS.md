# QA results (T12)
Date: 2026-11-15 (run on one macOS machine, Node v26.13.1, Playwright 1.65.1).

## Scope and honesty
- Every browser run used **Playwright emulation** on **software GL (SwiftShader)**. No real phone, tablet, GPU or screen reader was used. See docs/17 for what is still not done.
- The "tablet" (820x1180, touch) and "mobile" (390x844, touch, `isMobile`) projects emulate viewport, touch events and device pixel ratio in Chromium. They do not emulate iOS Safari, Android Chrome, or their touch scrolling behaviour.
- The suite runs against the production build served by `vite preview` (port 4173). Each test gets a fresh Playwright browser context (no stored state).

## Commands and results (actual)
| Command | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run typecheck:e2e` | clean |
| `npm run lint` | clean |
| `npm run test:run` | 263 passed, 27 files (260 before T12, 3 new `fitCameraDistance` tests; `AppShell.test` edited) |
| `npm run build` | passes (same chunk-size warning for the lazy 3D chunk) |
| `npm run e2e` (installed Google Chrome, channel `chrome`) | 64 passed, 5 skipped, 0 failed (69 = 23 tests x 3 projects) |
| `npm run e2e:ci` (bundled Chromium headless shell, the CI path) | 64 passed, 5 skipped, 0 failed |
| `pytest` in `services/tutor` (venv under /tmp) | 19 passed |

The 5 skips are by design: the Tab-order test runs on desktop only (2 skips), touch-only tests do not run on desktop (2 skips), and the 3D port-list test is skipped on the phone project, which defaults to the schematic (1 skip). Skipped means not run.

CI workflow `.github/workflows/ci.yml`: see the T13 and final-pass sections for the real GitHub runs. (When this section was first written it had not run on GitHub.)

## What the E2E suite covers
R1 guest start and skip link, unlock gating, R8 erase (keys cleared, re-locks mission 2), corrupt, future-version and blocked localStorage, mission 1 by keyboard in the schematic (open loop dark, open switch dark, lit from report, quiz, completion dialog, reload persistence, completion not counted twice), 3D port list path, missions 2 and 3 end to end, series wiring rejected in mission 3, R5 tutor with no key (Local guide), R7 WebGL disabled (fallback and mission 1 completable), axe-core in real Chrome on portal, map, erase dialog, mission (3D and schematic), no horizontal scroll, 44px target check, touch tap flow. A console guard fails any test on `console.error`, uncaught page errors, or non-allowlisted warnings (allowlist in `e2e/fixtures.ts`, each entry with a reason; its failing path was checked once with a deliberate `console.error`).

## Bugs found and fixed
1. **First Tab skipped the skip link.** `AppShell` moved focus to the `h1` on first render, so on a fresh load the first Tab stop was not the skip link. Fix: focus moves only when the screen changes (`src/app/AppShell.tsx`). `AppShell.test.tsx` now asserts focus is not stolen on load.
2. **3D bench cropped on phones.** At 390px the canvas is almost square, and the fixed camera cut off the battery and lamp at the edges (found in a screenshot, not by an assertion). Fix: `fitCameraDistance` in `geometry.ts` plus a `FitCamera` component in `LabScene.tsx` pull the camera back for narrow canvases. 3 new unit tests. A Chrome emulation screenshot afterwards showed all three parts and their ports. No E2E assertion checks the canvas contents.

Test-side fixes (not app bugs): erase dialog role is `alertdialog`; the diagnostic status text is uppercase `VALID`.

## Known gaps
- Everything in docs/17.
- No Firefox or WebKit run.
- The 44px check scans portal, map and mission schematic/3D at the initial state, not every dialog.
- Orbit-by-touch and pinch in the real canvas were not exercised; only the list and schematic tap paths were.
- `baseline-browser-mapping` and `caniuse-lite` data are stale warnings from the build tools (not app errors).

## T13 live deployment (2026-11-15)
- **URL:** https://wonderverse-ai.vercel.app (repo https://github.com/FahadIqbal/wonderverse-ai). Anonymous `curl` returns 200 with the "WonderVerse AI - Observatory Lab" title; unknown paths return 404.
- **Deployment protection:** the branch alias `wonderverse-ai-git-main-fahad-iqbal88-yahoocoms-projects.vercel.app` redirects anonymous visitors to Vercel SSO. Use the production URL above for sharing. If it ever starts redirecting, set Project Settings > Deployment Protection > Vercel Authentication off for Production.
- **First CI run failed:** `postcss.config.js` requires `autoprefixer`, which was not in `package.json` (it only resolved on the author's machine). Reproduced in a fresh clone, fixed in 3608a86. CI is green on that commit (web, e2e, tutor jobs).
- **E2E against the live URL** (`E2E_BASE_URL=https://wonderverse-ai.vercel.app npm run e2e:ci`, clean contexts, desktop/tablet/mobile): 64 passed, 5 skipped (by design), 0 failed. Console guard passed on production.
- **Local after the fix:** tsc, e2e typecheck, lint clean; 263 unit tests pass; build passes; local E2E 64 passed, 5 skipped.
- **Gaps:** hashed `/assets/*` were served with `max-age=0`; `vercel.json` now sets `immutable` one-year caching (takes effect on the next deploy). The 3D chunk (about 933 kB, 250 kB gzip) is lazy-loaded and was not trimmed. The favicon file was named `vite.svg` (content was already the project mark; renamed in the final pass). No real-device, Firefox or WebKit check.

## Final gap-closing pass (2026-11-15, same machine, Node v26.13.1, Playwright 1.65.1)
Scope: mission layout rework, favicon/meta/robots/404, asset register, date corrections, bundle measurement. Local, Chromium on software GL, emulated tablet and phone only.
| Command | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run typecheck:e2e` | clean |
| `npm run lint` | clean |
| `npm run test:run` | 263 passed, 27 files (no unit test needed changing; none added) |
| `npm run build` | passes; same chunk-size warning |
| `npm run e2e:ci` (bundled Chromium) | 72 tests: **65 passed, 2 flaky (failed first attempt, passed on retry), 5 skipped, 0 failed**. 72 = 24 tests x 3 projects; one new test (`mission layout`) added. Took 10.5 min. |
The two flaky tests were the first two desktop tests of the run (axe scan, and no-horizontal-scroll). Each hit the 60 s test timeout on the first attempt (one in `openMission` waiting for the lab region, one in `page.evaluate`) and passed in 2 to 3 s on retry. I re-ran that spec file alone on desktop and both passed on the first attempt (17 s). I did not find the cause; a cold start of the first 3D scene on software GL is a guess, not a finding. If it recurs, treat it as an open flake.
**Layout measurements** (Chrome, 1280x800 desktop; 820x1180 tablet; 390x844 phone), y of the top of the 3D stage (phone uses the schematic):
| | Before | After |
|---|---|---|
| Desktop 3D stage | 971 to 1491 (below the 800 px fold) | 347 to 787 (inside the fold) |
| Tablet 3D stage | 1123 | 347 |
| Phone lab view toggle | not measured | about 181; schematic below it |
**Bundle:** `LabScene` chunk 933.17 kB (250.43 kB gzip) before and after; main chunk 292.67 kB to 292.76 kB. The drei deep-import experiment gave no change and was reverted (docs/12).
Not tested in this pass: real devices, Firefox, WebKit, screen readers (docs/17).

### After the push (aef5e0f)
- `git push origin main` succeeded (cd0cdfb..aef5e0f). GitHub Actions run 43721450720 on aef5e0f: `completed`, `success` (read through the public API).
- The live asset hash changed from `index-DJgmfpVo.js` to `index-B_fBlYc_.js` on the third poll (about 30 s after the push). `/robots.txt` 200, `/favicon.svg` 200 (image/svg+xml), an unknown path returns 404 with the custom `404.html`, and `og:title` is in the served HTML.
- `E2E_BASE_URL=https://wonderverse-ai.vercel.app npm run e2e:ci`: 72 tests, **67 passed, 5 skipped, 0 failed, 0 flaky** (45.9 s). This includes the new first-viewport test running against production.
- Screenshots 03, 04 and 05 in `submission/screenshots/` were retaken from the live site (1280x800, clean context, no console errors) after this deploy.
