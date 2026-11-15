# Performance & quality budgets

## Targets (validate, do not assert as achieved)
FCP < 2.5s on mid-tier laptop under normal broadband; scene first-interaction < 4s; desktop >= 50fps typical, low-end >= 30fps; solver P95 <= 30ms for <= 20 components; clicks <= 100ms perceived; accessibility score >= 90 where automated tools apply (manual testing still mandatory).

## Measurement
Use Lighthouse, browser Performance panel, sampled FPS, Playwright timers, solver benchmark fixtures, and real-device tablet spot checks. Record device/browser/network/commit for each figure.

## Optimization
Instancing/reuse geometries, procedural meshes, limited lights, demand rendering during idle, dynamic pixel ratio, avoid unnecessary react state updates from frame loop, lazy-load audio and scene, abort stale requests, throttle tutor calls. Keep one scene graph, not a new WebGL context per mission.

## Minimal local events
Track `mission_started`, `circuit_solved`, `hint_used`, `mission_completed` locally for UI recap. No remote telemetry in MVP. Console logs must not include question text, personal data, or credentials.
