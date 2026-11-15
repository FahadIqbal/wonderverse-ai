# Requirements (EARS style)

**R1** WHEN a guest opens the app THEN system SHALL offer an accessible start path without login.
**R2** WHEN learner places/connects an allowed circuit component THEN system SHALL validate terminals and update canonical graph.
**R3** WHEN graph changes THEN system SHALL compute a deterministic DC simulation report with reason codes.
**R4** WHEN the simulator reports no valid energized path THEN renderer SHALL not illuminate the corresponding bulb.
**R5** WHEN learner requests a hint THEN tutor SHALL receive solver-backed context and return a guided, age-appropriate response or authored fallback.
**R6** WHEN the learner meets both circuit and learning objectives THEN mission SHALL advance once and persist progress.
**R7** IF model provider or WebGL is unavailable THEN learner SHALL still complete mission one using local hints and schematic editor.
**R8** WHEN guest chooses erase progress THEN app SHALL clear locally persisted guest data.
**R9** WHEN app is deployed THEN a judge SHALL reproduce the three-mission flow with no secrets or private account.

Traceability: R1→FR01, R2→FR02-03, R3→FR04, R4→FR05, R5→FR07-08, R6→FR06/09, R7→FR11, R8→privacy, R9→release gate. See `docs/07-ACCEPTANCE-AND-TEST-PLAN.md`.
