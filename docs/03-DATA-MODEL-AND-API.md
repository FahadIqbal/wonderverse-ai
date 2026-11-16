# Domain model, storage & API

## Entities
`Component(id, kind, terminals, electricalProps, transform)`; `Wire(id, fromTerminal, toTerminal)`; `Circuit(version, components, wires)`; `SimulationReport(status, reasonCodes, voltageMap, currentMap, bulbStates)`; `Mission(id, objective, allowedParts, predicates, hints)`; `Progress(missionId, state, attempts, evidence, timestamp)`; `TutorTurn(role, text, reportHash)`.

## Local-first persistence
Key `wonderverse:session:v1` (the key name never changed; the version inside the JSON did). Current `schemaVersion` is **3** (`SESSION_SCHEMA_VERSION` in `src/domain/learning/session.ts`). v2 added `settings.tourSeen` and per-mission `recaps`; v3 added an explicit layout `position` on every saved component. v1 and v2 sessions are migrated on load, never discarded. Store only a pseudonymous guest session, mission progress, circuit layout, UI prefs. No actual learner name, birthday, location, chat transcript or identifiers. Zod validates on read; a session that is corrupt or from a newer version is cleared gracefully. `Erase progress` removes every `wonderverse:*` key.
## Example JSON (illustrative, trimmed; the Zod schema in `session.ts` is the source of truth)
```json
{"schemaVersion":3,"completed":["complete-loop"],"settings":{"lowPower":false,"tourSeen":true},"missions":{"complete-loop":{"graph":{"components":[{"id":"battery-1","type":"battery","label":"Battery 1","position":{"x":110,"y":70},"voltage":9,"isOn":true,"terminals":[{"id":"battery-1-pos","name":"positive","position":{"x":75,"y":70}},{"id":"battery-1-neg","name":"negative","position":{"x":145,"y":70}}]}],"wires":[]},"state":{"phase":"building","eventLog":[]}}},"recaps":{}}
```
## Tutor gateway: `POST /api/hint` (Vercel function, primary)
Source: `server/tutor/` (handler, providers, prompt, config, rate limiter), bundled to `api/hint.js` by `npm run build:api`.
- **Request** `{ context: TutorContext, question?: string }`, strict. `context` is the same Zod `TutorContext` the browser builds (`src/domain/learning/tutor/schemas.ts`: report numbers, counts, lamps, switches, objectives, authored hint, at most 8 short event strings; no names or free text). `question` is at most 200 characters and is re-screened with `screen.ts` on the server.
- **Response 200** `{ text, source: 'ai' }`. `text` has passed the server-side `validateTutorText`; the browser validates it again.
- **Errors** `{ error }` only: `405 method_not_allowed` (with `Allow: POST`), `403 origin_not_allowed`, `429 rate_limited` (with `Retry-After`), `413 payload_too_large` (8 KiB), `422 invalid_request` or `question_not_allowed`, `503 tutor_unavailable` (provider, model or key missing or invalid), `504 tutor_timeout` (8 s), `502 tutor_upstream_error` or `tutor_bad_reply`. Provider bodies are never echoed.
- **Config (server only)** `TUTOR_PROVIDER` (`openai|anthropic|gemini|openrouter`), `TUTOR_MODEL`, `TUTOR_API_KEY`, optional `TUTOR_ALLOWED_ORIGINS`, `TUTOR_RATE_LIMIT`.
- The earlier FastAPI gateway (`services/tutor`, `POST /hint` with `{context, question}` returning `{text}`) is kept and still tested, but it has no real provider wired. It is now secondary; `VITE_TUTOR_URL` still points the browser at it.
## DB only after MVP
If multi-device sync later: Postgres tables `sessions`, `circuits`, `missions`, `attempts`, with row access policies. Parental consent/privacy review required before real child profiles.
