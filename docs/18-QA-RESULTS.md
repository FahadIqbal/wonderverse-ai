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
## Visual polish pass (2026-11-16, macOS)
| Command | Result |
| --- | --- |
| `npx tsc -b`, `npm run typecheck:e2e`, `npm run lint` | clean |
| `npm run test:run` | 29 files, 281 tests passed (was 27 files, 263; the extra tests cover feedback motion hooks, calm gating in the schematic and the new contrast pairs) |
| `npm run build` | built; main JS 300.50 kB, CSS 25.55 kB, 3D chunk 935.65 kB (before: 292.99, 16.09, 933.17) |
| `caffeinate -i npm run e2e:ci` | 74 passed, 19 skipped, 0 failed |
A first e2e run found one real failure (axe colour contrast on a button mid-transition, mobile project); fixed by removing the colour transition, then re-run green. A temporary screenshot spec (not committed) captured portal, map, mission 1 schematic, 3D, completion dialog and the map after completion at 1440x900 and 390x844, with reduced motion off and on, from the local production build with local Chrome and SwiftShader. The console guard saw no unexpected console output. With reduced motion on it asserted no `lamp-pulse`, `wire-snap`, `tick-pop` or `reject-shake` class and no shake on a rejected connection; with it off it asserted the lamp pulse (exactly one lit lamp) and the shake. Screenshots are in `submission/screenshots/` (14 files, largest 216 KB). Not a live-site capture; real GPU look not checked.
Pushed as a077dee. GitHub Actions run 43733839707 on a077dee: success (public API). Live asset hash changed to `index-CmaBLMMU.js`; `E2E_BASE_URL=https://wonderverse-ai.vercel.app npm run e2e:ci`: 74 passed, 19 skipped, 0 failed.
## Final agent pass (2026-11-16, macOS)
Scope: live-URL screenshot recapture, 3D lamp pulse, consistency audit of README, docs and submission files.
| Command | Result |
| --- | --- |
| `npx tsc -b`, `npm run typecheck:e2e`, `npm run lint` | clean |
| `npm run test:run` | 29 files, 284 tests passed (281 before; 3 new tests for the pulse decision helpers in `geometry.test.ts`, one a fast-check property) |
| `npm run build` | built; main JS 300.50 kB, 3D chunk 936.28 kB (935.65 before) |
| `caffeinate -i npm run e2e:ci` (bundled Chromium path, 2 workers) | 74 passed, 19 skipped, 0 failed (console guard active on every test) |
- **Screenshots.** All 14 files in `submission/screenshots/` were recaptured from https://wonderverse-ai.vercel.app (the polish build a077dee, before the pulse) with a temporary Playwright spec (not committed): clean contexts, Chrome with SwiftShader, desktop 1440x900 and mobile 390x844 (device scale 2), reduced motion on and off. Console guard (errors, warnings, page errors, minus the three allowlisted software-GL and three.js notices): no unexpected output in any of the four contexts. Sizes 97 to 398 KB. Files 02 and 06 on desktop came out byte-identical to the previous capture.
- **3D lamp pulse.** `sceneFrameloop(calm, litLampCount)` in `src/features/lab/scene/geometry.ts` returns `'always'` only when the report has at least one lit lamp and neither reduced motion nor Low-power is on; otherwise `'demand'`. `lampPulseFactor(t)` scales the filament emissive intensity and halo opacity by 1 +/- 10% over a 2.4 s period. Nothing in the pulse decides whether a lamp is lit. Not measured: frame rate or battery cost, and the look on a real GPU. The pulse is visible only in a live motion-allowed browser; no E2E asserts it.
- **Consistency fixes.** Counts (284 unit, 74 passed and 19 skipped E2E), screenshot provenance, CI status (run 43734538913 on 1e7544b: success), the font and icon statements in the asset register and checklist, the demo script's portal and map wording, and the stale favicon and 933 kB remarks in the Devpost draft. All URLs in README, docs and submission files returned 200 (`curl`).
## Bundle size pass (2026-11-16, macOS)
| Command | Result |
| --- | --- |
| `npx tsc -b`, `npm run typecheck:e2e`, `npm run lint` | clean |
| `npm run test:run` | 29 files, 284 tests passed (same count; existing assertions now `await findBy...` for the lazy mission screen) |
| `npm run build` | built; see table |
| `caffeinate -i npm run e2e:ci` equivalent (`CI=1 npx playwright test`, bundled Chromium, 2 workers, 1 retry) | 72 passed, 19 skipped, 0 failed, 2 flaky (tablet a11y-and-touch, failed on attempt 1 with a reported 15.5 min duration, i.e. the laptop paused mid-run; both passed on retry and again in an isolated rerun, 4 passed) |

| Chunk | Before (raw / gzip kB) | After (raw / gzip kB) |
| --- | --- | --- |
| index (main) JS | 300.50 / 90.54 | 257.22 / 78.03 |
| MissionView JS (new, lazy) | n/a | 44.18 / 14.63 |
| webgl JS (new, shared) | n/a | 0.55 / 0.37 |
| LabScene JS (lazy) | 936.28 / 251.25 | 936.32 / 251.27 |
| CSS | 25.55 / 5.83 | 25.55 / 5.83 |

First-load JS on the portal (Playwright, response bodies, uncompressed): 293.5 -> 251.2 kB. Local `vite preview` only; no live-site measurement and no throttled-network timing.
## Learning UX pass (2026-11-16, macOS, Node v26.13.1, Playwright 1.65.1)
| Command | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run typecheck:e2e` | clean |
| `npm run lint` | clean |
| `npm run test:run` | 36 files, 331 tests passed (284 before this slice and the bundle pass; new: `nextStep` fixtures per status, reason and phase plus a 500-run property, `recap`, `meter`, session v1 -> v2 migration, `MeterPanel`, tour, HUD next step, recap dialog, axe on the tour and meter) |
| `npm run build` | passes; main 259.56 kB (was 257.22), MissionView 55.40 kB (was 44.18), LabScene 936.32 kB unchanged |
| `caffeinate -i npm run e2e:ci` | 83 passed, 19 skipped, 0 failed (74 before; +3 tests x 3 projects in `e2e/learning-ux.spec.ts`: tour skip and reopen, next-step text and meter in both views, recap content and reload) |
- No existing E2E test was edited. The tour card is not modal, so flows that press Start mission still work with it open.
- Not run: GitHub Actions result for this commit is recorded in docs/12 or the final report, not here. Everything above is Playwright emulation on software GL; no screen reader, real device or learner testing.
## Drag-and-drop pass (2026-11-16, macOS, Playwright 1.65.1)
| Command | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run typecheck:e2e` | clean |
| `npm run lint` | clean |
| `npm run test:run` | 38 files, 371 tests passed (331 before; new: layout and position independence, drag controller, `rayToBench`, session v2 -> v3, schematic keyboard move and undo) |
| `npm run build` | passes; main 262.06 kB (was 259.56), MissionView 57.95 kB (was 55.40), LabScene 938.96 kB (was 936.32), CSS 26.46 kB |
| `caffeinate -i npm run e2e:ci` | 93 passed, 24 skipped, 0 failed, 0 flaky (83 passed, 19 skipped before; +5 tests x 3 projects in `e2e/move-parts.spec.ts`) |
- One earlier full run reported 1 flaky (final switch click after a drag landed before the feedback bar had settled and shifted the stage). The test now waits for the message and re-centres the stage; 6 repeats of that test passed. Not proof it cannot recur.
- The 3D drag test uses `page.mouse` on the software-GL canvas and is reliable here on the desktop project; it is skipped on tablet and mobile (they default to the schematic). The touch test sends real touch events through the Chrome DevTools Protocol (Chromium, touch projects only).
- Not run: GitHub Actions for this commit (see docs/12 or the final report). No real GPU, real touch device, screen reader or learner testing.
