# Technical architecture & contracts

## Architecture (web-first modular monolith)
```text
React/Vite/TypeScript UI
 ├─ World: react-three-fiber / drei / three
 ├─ Lab interaction controller (pointer + keyboard)
 ├─ Circuit domain module (pure TS graph, solver, validators)
 ├─ Mission state machine (events + guards)
 ├─ Tutor orchestration (structured grounding and fallback)
 └─ State: Zustand + versioned localStorage
         |
         +-- optional FastAPI tutor gateway -- approved model API
```

## Recommended stack
Vite, React, TypeScript strict, react-three-fiber, drei, Zustand, Tailwind CSS, Radix primitives, Framer Motion (sparingly), Zod, Vitest, Testing Library, Playwright, fast-check. Add Python FastAPI **only** when model gateway is needed: no backend is required for local deterministic simulation or guest mode. Server secret never ships to client. Keep dependencies pinned and licensed.

## Authority boundaries
- **Circuit engine:** source of truth for states & measurements.
- **Mission engine:** evaluates solution predicates against engine state and learner actions.
- **Tutor:** interprets provided engine report; prohibited from setting completion, energizing parts, or changing measurements.
- **Renderer:** converts state to visuals; cannot invent simulation truth.

## Data flow
`UI action → validate → update graph → solve circuit → emit SimulationReport → mission guards → render + accessible report → optional context to tutor`.

## Explicit interfaces
```ts
type TerminalId = string;
type Component = { id:string; kind:'battery'|'switch'|'bulb'|'wire'; terminals:TerminalId[]; props:Record<string, number|boolean> };
type Edge = { a:TerminalId; b:TerminalId };
type Circuit = { schemaVersion:1; components:Component[]; edges:Edge[] };
type SimulationReport = { status:'valid'|'open'|'short'|'invalid'; reasonCodes:string[]; bulbStates:Record<string,{on:boolean; currentA:number}>; computedAt:number };
```
`computedAt` is diagnostic metadata; do not use it to award progress. Report should include provenance/version and warnings for approximations.

## Implementation order
Pure solver first → circuit tests → headless interactive editor → 3D projection → mission guards → tutor → polish → deploy. Never place crucial physics in scene components.

## Fallback plan
Model API outage: deterministic local hint mapping keyed by reason code. WebGL absent: functional schematic/editor view. No server: demo remains functional. Avoid unneeded infrastructure until core journey works.
