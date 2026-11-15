# Test strategy & definition of done

## Test pyramid
- Unit (Vitest): graph validation, nodal solver, mission state machine, persistence migration, hint templates.
- Property-based (fast-check): edge permutation, topology invariants, finite output, data sanitization.
- Component (Testing Library): tray, mission card, diagnostics, keyboard circuit editor, tutor fallback.
- E2E (Playwright): guest entry → mission 1 → failure → tutor hint → fix → success → refresh persists → mission 2 → mission 3.
- Manual: touch, screen-reader, reduced motion, WebGL failure, narrow screens, model outage, throttled CPU/network.

## Gherkin samples
**Valid loop:** Given battery, closed switch and lamp connected in a loop, when simulation computes, then bulb is on and report is valid.
**Broken loop:** Given same setup, when switch opens, then bulb is off and report explains open state.
**Fault correction:** Given a missing return path, when learner repairs it, then mission advances only after required evidence actions.
**Tutor outage:** Given unavailable model API, when a hint is requested, then an authored contextual hint appears without loading forever.
**No fabricated result:** Given battery short, when UI renders, then no lamp is shown energized.
**Keyboard:** Given WebGL unavailable, when user uses schematic controls by keyboard, then they can complete mission 1.

## Build gates
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test`; agents may adjust commands but must document deviations. Include CI pipeline. Perform smoke test against real deployed URL with fresh browser context.

## Release definition
P0 requirements pass; zero critical errors in browser console, no broken nav, no secret exposed, cold start works, links work, licenses tracked, `/.kiro` present in GitHub, deployment available for judges. Include reproduction steps for any known limitation.

## Evidence collection
Keep `evidence/` screenshots, test output, benchmark notes and a short walkthrough recording. Only cite actual metrics measured on real build; do not backfill fictional performance results.
