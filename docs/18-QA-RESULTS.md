# QA results (T12)
Date: 2026-11-19 (run on one macOS machine, Node v26.13.1, Playwright 1.65.1).

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

CI workflow `.github/workflows/ci.yml` was written but **has not run on GitHub**; its steps were run locally one by one.

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
