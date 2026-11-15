# Devpost submission (ready to paste; every fact comes from this repo)

Placeholders that a human must fill are marked `[TODO: ...]`. Nothing here was submitted. Review the whole text before pasting.

## Project name
WonderVerse AI: The Electricity Lab

## Category
**Frankenstein**

## Elevator pitch (tagline)
Build a circuit in 3D, watch a deterministic solver decide whether the lamp lights, and get hints from a tutor that reads the same circuit report.

## Links
- Live app (no login): https://wonderverse-ai.vercel.app
- GitHub (MIT licensed): https://github.com/FahadIqbal/wonderverse-ai
- YouTube demo (under 3 minutes): `[TODO: YouTube URL]`

## Screenshots to upload
Files are in `submission/screenshots/` (captured from the live URL in a clean browser context on 2026-11-15, desktop 1280 px wide; 03, 04 and 05 were retaken after the layout change on 2026-11-15, 01 and 02 were not retaken because the layout change does not affect them):
1. `01-portal.png` - portal
2. `02-mission-map.png` - mission map
3. `03-mission1-lamp-lit-schematic.png` - mission 1, lamp lit, schematic view, objectives beside it (first screen, 1280x800)
4. `04-mission1-3d-view.png` - mission 1, lamp lit, 3D bench, objectives beside it (first screen, 1280x800; the diagnostic table is below the fold)
5. `05-completion-dialog.png` - "Mission complete: Complete the Loop"

`[TODO: pick the order and choose a thumbnail; add a mission 2 screenshot if you want one]`

## Inspiration
Hands-on science is hard to set up and hard to personalize. We wanted a place where a 10 to 14 year old can build a circuit, break it, and see why it stopped working, with answers that come from the circuit itself.

## What it does
- **Guest start.** Open the site and press "Enter the Lab". No account, no sign-in.
- **3D bench with a schematic alternative.** Learners connect a battery, switch and lamps by clicking ports in a 3D scene. A keyboard-operable schematic view and a port list edit the same circuit.
- **Deterministic solver.** A pure TypeScript module computes voltages, currents, lamp state and a reason code for every change. Lamps glow only when the solver report says they are energized. A diagnostic table shows the numbers (for example 3.00 V and 499.9 mA for a lit one-lamp loop).
- **Three missions** with a state machine: 1) Complete the Loop, 2) Fix the Fault (a missing return wire), 3) Light the City (two lamps in parallel; one can go dark while the other stays on). Each has objectives, a concept check and a completion summary. Missions unlock in order and progress is saved in the browser.
- **Tutor ("Nova").** Hints are built from the solver report and mission state. The only tutor that runs in the deployed app is the offline **Local guide**. There is an optional FastAPI gateway in `services/tutor`, but **no model provider is connected**, so the app always uses the Local guide.
- **Privacy and recovery.** Progress is stored in localStorage only. "Erase my progress" clears it. If WebGL is unavailable or a 3D scene fails, the schematic is used and mission 1 can still be finished.

## How we built it
- **Stack** (from `package.json`): React 18, TypeScript 5.6 (strict), Vite 6, three.js with @react-three/fiber and @react-three/drei, Tailwind CSS 3, Zustand 5, Zod 3. Tests: Vitest 2, Testing Library, fast-check, axe-core, Playwright. Lint: ESLint 9. Optional gateway: FastAPI with pytest. Hosting: Vercel (static). CI: GitHub Actions.
- **Architecture.** `CircuitGraph` reducer, then `solveCircuit`, then an immutable report, then the mission evaluator, the 3D scene, the schematic and the tutor. Renderers and tutor only read the report. The solver has no rendering imports.
- **Kiro.** The repo tracks `.kiro/steering/` (product, tech, structure, quality) and `.kiro/specs/wonderverse-mvp/` (requirements in EARS form R1 to R9, design, and a task list T01 to T14 with `tasks.meta.json` execution history). Work followed the spec task by task, and `docs/12-DECISION-LOG.md` records decisions per task. The full, evidence-based account, including what cannot be verified, is in `docs/19-KIRO-USAGE-RECORD.md`. No Kiro hooks or MCP servers are configured in this repo, and we did not use any.

## Challenges
- **The first solver was wrong.** A path-search (BFS) prototype lit lamps that were not on a complete loop and summed parallel resistance incorrectly. We replaced it with nets plus nodal analysis (ADR-006 in the decision log) and tested it, including property tests over random wiring.
- **Invalid `vercel.json`.** A duplicated header object made the config invalid. Fixed in commit d87e132.
- **Missing `autoprefixer`.** `postcss.config.js` needed it but `package.json` did not list it, so it only worked on the author's machine. The first GitHub Actions run failed; we reproduced it in a fresh clone and fixed it in commit 3608a86.
- **Accessibility bugs found by testing.** The first Tab stop skipped the skip link, and the 3D bench was cropped on a 390 px wide viewport (details in `docs/18-QA-RESULTS.md`).
- **Staying grounded.** The tutor can only use fields from the report, so hints cannot invent readings.

## Accomplishments (test counts from `docs/18-QA-RESULTS.md`)
Scope: one macOS machine, Node 26.13.1, Playwright 1.65.1, Chrome and bundled Chromium, software WebGL (SwiftShader), Playwright **emulation** for tablet and phone sizes. The doc's date and the repository commits are both 2026-11-15.
- `npm run test:run`: **263 unit and property tests passed**, in 27 files.
- `npm run e2e`: **64 passed, 5 skipped, 0 failed** (23 tests across desktop, tablet and phone projects). The skips are by design.
- The same E2E suite against the live URL (`E2E_BASE_URL=https://wonderverse-ai.vercel.app`): 64 passed, 5 skipped, 0 failed (docs/18, T13 section).
- `pytest` for the tutor gateway: 19 passed.
- `tsc -b` and `npm run lint`: clean in that run.
- GitHub Actions CI (web, e2e, tutor jobs) is reported green on commit 3608a86 in docs/18. `[TODO: confirm on the Actions tab]`
- axe-core checks on portal, map, erase dialog and mission screens, run in real Chrome, with a console-error guard on every E2E test.

## What we learned
- A single source of truth (the solver report) keeps the 3D view, the schematic, the tutor and the missions consistent, and makes bugs easy to isolate.
- Dependency omissions can hide on the author's machine; a fresh clone and CI catch them.
- Automated accessibility checks found real problems, and they are still not a substitute for a screen-reader test.

## What's next
- Add a real model provider behind the existing gateway, keeping the Local guide as fallback.
- Test with real phones, tablets and screen readers (the checklist is `docs/17-MANUAL-QA-CHECKLIST.md`).
- Trim the lazy 3D chunk (about 933 kB, 250 kB gzip) and replace the default favicon.
- More circuit content (for example series versus parallel comparisons) and a free-play mode.

## Honest limitations
- The solver models simplified DC circuits only: an ideal battery, fixed-resistance lamps and resistors, switches. It is a teaching model, not a general simulator, and not electrical-safety advice.
- No AI model is connected. The tutor is the offline Local guide.
- No real-device, real-GPU or screen-reader testing has been done. Phone and tablet results are Chrome emulation.
- Firefox and Safari/WebKit were not run.
- No user study, no usage data and no performance benchmarks exist, so we make no claims about learning outcomes or speed.
- Progress is browser-local; there are no accounts.
- Mission 3 is covered by automated tests and is not shown being played in the demo video.

## Built with
React, TypeScript, Vite, three.js, @react-three/fiber, @react-three/drei, Tailwind CSS, Zustand, Zod, Vitest, Testing Library, fast-check, axe-core, Playwright, ESLint, FastAPI (optional gateway), Vercel, GitHub Actions, Kiro.

## Kiro use (short form for the Devpost Kiro field)
Kiro specs (`.kiro/specs/wonderverse-mvp`: requirements R1 to R9, design, tasks T01 to T14 with execution history) and four steering files (`.kiro/steering/`) drive the build. Specs shaped the architecture (solver report as the only source of truth for the renderers and tutor) and the test plan. Hooks and MCP were not used. See `docs/19-KIRO-USAGE-RECORD.md`.

## Before pressing Submit
See `submission/COMPLIANCE-CHECKLIST.md` for the status of each item.
