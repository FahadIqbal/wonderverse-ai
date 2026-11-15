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

## Closing pass (2026-11-15, same machine, Node v26.13.1, Playwright 1.65.1)
Scope: flake investigation, licence audit, engine-level Firefox/WebKit runs, new emulation checks. Bundled Chromium 159.0 (CI path), Playwright Firefox 159.0 and WebKit 27.2 builds on macOS, software GL. **Engine-level and emulated; not real Firefox, Safari, devices, GPUs or screen readers.**
### Flake (first two desktop tests hit the 60 s timeout once)
- **Not reproduced by re-running.** Before any change: 3 full desktop runs with retries off (22 passed each), 1 full three-project run with retries off (67 passed, 5 skipped), `--repeat-each=3` on the two tests (6 passed), and a run with 22 busy-loop processes on 11 cores (44 passed in 1.0 min instead of about 25 s). 0 failures in about 150 test executions. Normal run time of these tests is 1.5 to 2.5 s, so a 60 s timeout is a stall, not slowness.
- **Likely root cause: the Mac went to idle sleep during the run.** `pmset -g log` shows `Entering Sleep state due to 'Idle Sleep'` at 21:32:57 +0800 for 596 s, inside the 10.5 min final-pass run (normal length about 35 s). The same thing happened later in this pass: the live-URL run below had 2 tests take 7.8 min each, and `pmset` shows a sleep at 22:43:00 for 470 s (7.8 min). Both times the two tests running in parallel stalled together and passed on retry, which fits a host-wide stall rather than an app or server problem. This is strong circumstantial evidence, not a reproduction.
- **What changed:** `e2e/global-setup.ts` requests `/` and every file in `dist/assets` once after the preview server is up (removes the cold-server and first-chunk cost from the first tests; not the cause, kept as cheap hygiene), and 30 s `actionTimeout`/`navigationTimeout` so a stalled action fails with its name. The fix for the sleep cause is operational: run long local suites with `caffeinate -i npm run e2e:ci` on macOS, or with the lid open on power. Not added to the npm scripts because `caffeinate` is macOS-only.
- **After:** the two tests `--repeat-each=5` on desktop with retries off: 10 passed. Three more full three-project runs, retries off: 73 passed, 17 skipped, 0 failed, 0 flaky each (34 to 35 s).
### Commands (final)
| Command | Result |
|---|---|
| `npx tsc -b`, `npm run typecheck:e2e`, `npm run lint` | clean |
| `npm run test:run` | 263 passed, 27 files (no app code changed, none added) |
| `npm run build` | passes |
| `npm run e2e:ci` (bundled Chromium; 30 tests x 3 projects = 90) | **73 passed, 17 skipped, 0 failed, 0 flaky** (35 s) |
| `E2E_CROSS=1 ... --project=firefox --project=webkit --repeat-each=3` | **156 passed, 24 skipped, 0 failed** (1.0 min); 180 = 30 tests x 2 browsers x 3 |
| `pytest` in `services/tutor` (fresh venv under /tmp from `requirements-dev.txt`) | 19 passed |
New tests: 6 in `e2e/emulation.spec.ts` (keyboard-only walk, forced colors, two reduced-motion, two zoom viewports). The skips are by design: desktop-class only for emulation (12 on tablet and phone), plus the earlier 5.
### Firefox and WebKit findings (opt-in projects, `E2E_CROSS=1`; not in CI)
1. **Playwright's Firefox page crashes when axe-core runs on the mission screen** ("Page crashed"), deterministically, with or without WebGL and with app CSS removed. Narrowed to the Component tray section; axe on the same markup built by hand in a blank page does not crash, and the tray markup is valid (`<section aria-labelledby>`, disabled buttons with `aria-describedby`). I did not find the cause and I do not know whether it is Firefox, Playwright's Firefox build or axe-core. The mission-screen axe scan is therefore skipped on Firefox (portal, map and erase dialog are scanned and pass). Chromium scans all screens.
2. **Firefox logs the warning "WebGL context was lost." when a scene is disposed**, intermittently (seen in 2 of 3 tests once, not on every run). Allowlisted in `e2e/fixtures.ts` with a reason. I did not verify that it is only disposal and not a real loss.
3. **WebKit does not Tab to links** (Safari default behaviour), so the skip-link first-Tab test is skipped on WebKit. A keyboard-only mission walk is skipped on WebKit for the same reason (buttons). Real Safari with that setting on was not tested.
4. No app defect was found by these runs, so no app code changed. The mission 1 flow, missions 2 and 3, tutor fallback, WebGL-off fallback, privacy and erase tests passed on both engines.
### Emulation checks added (docs/17 items 12 to 15)
All in `e2e/emulation.spec.ts`; they are emulation, not real-world checks.
- Keyboard-only walk of mission 1, portal to completion dialog, using only Tab, Shift+Tab, Enter, Space and arrow keys, including dialog focus containment. Passes on Chromium and Firefox.
- Forced colors (`emulateMedia({forcedColors:'active'})`, Chromium only): focus outline present and at least 2 px, disabled and enabled text colours differ, lamp state stays in the report text, no horizontal overflow. A screenshot is attached to the test report; **no human reviewed it**.
- `prefers-reduced-motion`: the app sets `data-motion="calm"` when the preference is on, does not when off, and follows a live change. 3D flow-dot animation runs in the JS frame loop and cannot be observed from the DOM, so it is covered only by the existing unit tests.
- Zoom and reflow: viewports of 640x400 (200% of 1280x800) and 320x256 (400%, the WCAG reflow width). No page-level horizontal scroll on portal, map and mission; the mission 1 loop can be wired and the lamp lights. This is a smaller viewport, not browser zoom.
### Licences
See `submission/ASSET-AND-LICENSE-REGISTER.md`: 84 production npm packages and 399 total, no GPL or AGPL; one package without a `license` field (`webgl-constants`, MIT per its LICENSE file). Gateway packages: no GPL or AGPL.
Not tested in this pass: real devices, real browsers, screen readers.
### After the push of 8b3690e
- `git push origin main` succeeded (aef5e0f..8b3690e; 5f9dff1 went with it).
- **GitHub Actions run 43725807961 on 8b3690e: failure.** Web job and tutor job passed; the Playwright job's `npm run e2e:ci` step failed after 64 s (read through the public API). The log and artifact need GitHub auth, which this pass did not have, so **the failing test and its cause are unknown**. Locally the identical command passes (73 passed, 0 failed, four runs), so the failure is probably specific to Linux/ubuntu-latest. The CI config now adds Playwright's `github` reporter so the next run shows each failure as a public check annotation (local commit, not pushed).
- **Cause found (later):** run 43728490282 on 61b29ba failed the same way, and its public annotations name the test: `[desktop]` 400% zoom reflow (320x256), page overflow 18 px after wiring, failed on retry too (72 passed, 1 failed, 17 skipped). Linux fallback fonts are wider than macOS fonts; see "CI repair" below.
- **Live asset hash did not change** after the push (`index-B_fBlYc_.js` before and after). This pass changed no app code, so the bundle is identical and the same hash is expected; it does not show whether Vercel deployed 8b3690e.
- `E2E_BASE_URL=https://wonderverse-ai.vercel.app npm run e2e:ci`: 90 tests, **71 passed, 2 flaky, 17 skipped, 0 failed** (8.4 min). The 2 flaky tests (mobile: tampered-session gating, erase) each took 7.8 min on the first attempt and passed on retry; the machine was asleep for 470 s at that moment (see the flake section). The new emulation tests passed against production.

## CI repair (2026-11-15)
Defect: at 320 px the diagnostic table's min-content widened the single implicit grid column past the page (4 px with macOS fonts, 18 px on the Linux runner). Fix in `src/features/lab/SchematicEditor.tsx` (`grid-cols-[minmax(0,1fr)]`) and `src/features/lab/CircuitDiagnostic.tsx` (table in a focusable scroll region). New test: 400% zoom with a wide fallback font (fails without the fix on macOS: overflow 16 px).
Run on macOS after the fix:
| Command | Result |
| --- | --- |
| `npx tsc -b`, `npm run typecheck:e2e`, `npm run lint` | clean |
| `npm run test:run` | 27 files, 263 tests passed |
| `npm run build` | built |
| `npm run e2e:ci` (CI=1, bundled Chromium, 2 workers, 1 retry), run 1 | 74 passed, 19 skipped, 0 failed, 0 flaky |
| `npm run e2e:ci`, run 2 | 74 passed, 19 skipped, 0 failed, 0 flaky |
| `npx playwright test` (local Chrome) | 74 passed, 19 skipped, 0 failed |
GitHub Actions on the fix commit 1ecffb0: run 43729342001 **success** (observed through the public API). Playwright job annotation: 74 passed, 19 skipped (59.2 s); web and tutor jobs success.
