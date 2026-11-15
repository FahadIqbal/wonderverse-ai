# Phase prompts (use in order, one at a time)

## 1 — Foundational simulator
"Read docs/02, 03, 06 and .kiro spec. Implement validated graph and nodal/resistive solver, reason codes, fixtures, property tests. Do not write scene code until unit tests pass. Report measured values for the three 3V/6Ω reference cases and actual test output."

## 2 — Workbench interaction
"Read docs/01, 04, 14. Implement SchematicEditor and a 3D React Three Fiber workbench as two controllers of the same domain state. Add ports, wires, undo/reset, keyboard alternative, and live diagnostics. No decorative fake features. Test full circuit edit flow."

## 3 — Teaching missions
"Read docs/05 and 13. Implement M1/M2/M3 as authored config + guarded state machine. Provide remediation and quiz; completion only after solver evidence and quiz. Persist and version progress. Run E2E."

## 4 — Tutor
"Build safe offline contextual hints first. If secrets and runtime are configured, add a strictly bounded backend AI tutor with minimal sanitized context. Validate answers, never permit AI to change the simulation. Test outages, latency and prompt injection."

## 5 — Visual refinement
"Use docs/04. Upgrade all screens to polished, coherent premium design with crisp 3D objects, meaningful glow, fast animations, responsive sidebar, hover/focus/touch states. Preserve access, performance and tests. Compare actual screenshots at 1440/1024/768 and fix issues."

## 6 — Hardening and launch
"Use docs/07–11 and submission checklist. Run all tests, accessibility review, perf audit and clean browser deployment smoke. Fix critical issues. Publish reproducible build, repo with `.kiro/` and license, collect evidence for demo. Never invent a test result or URL."
