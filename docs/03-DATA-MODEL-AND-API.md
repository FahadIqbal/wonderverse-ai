# Domain model, storage & API

## Entities
`Component(id, kind, terminals, electricalProps, transform)`; `Wire(id, fromTerminal, toTerminal)`; `Circuit(version, components, wires)`; `SimulationReport(status, reasonCodes, voltageMap, currentMap, bulbStates)`; `Mission(id, objective, allowedParts, predicates, hints)`; `Progress(missionId, state, attempts, evidence, timestamp)`; `TutorTurn(role, text, reportHash)`.

## Local-first persistence
Key `wonderverse:session:v1`. Store only a pseudonymous guest session, mission progress, circuit layout, UI prefs. No actual learner name, birthday, location, chat transcript or identifiers. Validate with Zod on read and migrate/clear invalid schemas gracefully. Provide `Erase progress` control.

## Example JSON (illustrative—not a finished solution)
```json
{"schemaVersion":1,"missionId":"complete-loop","components":[{"id":"bat1","kind":"battery","terminals":["bat1:+","bat1:-"],"props":{"voltage":3}},{"id":"lamp1","kind":"bulb","terminals":["lamp1:a","lamp1:b"],"props":{"resistance":6}}],"wires":[],"ui":{"selectedId":null}}
```

## Optional tutor gateway
`POST /api/tutor/hint` body `{ missionId, question, simulationReport, recentActions, mode:'hint'|'explain'|'teachback' }`; result `{ answer, groundedReasonCodes, level, fallbackUsed }`. Use Zod/Pydantic on both ends. Max question 500 characters, max recent actions 12, and cap answer length. Rate limits, origin restriction, timeout ~8s, server-side API key. No user-supplied tool calls or tool execution by tutor.

## Mission events
`COMPONENT_ADDED`, `WIRE_CONNECTED`, `SWITCH_TOGGLED`, `SOLVER_UPDATED`, `HINT_REQUESTED`, `TEACHBACK_ANSWERED`, `MISSION_COMPLETED`. Guards read solver report and defined evidence; no direct `completeMission()` exposed from UI.

## DB only after MVP
If multi-device sync later: Postgres tables `sessions`, `circuits`, `missions`, `attempts`, with row access policies. Parental consent/privacy review required before real child profiles.
