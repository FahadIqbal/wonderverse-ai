# Roadmap, priority and execution checklist

## Timebox plan (suggested 14 working days; adapt to capacity)
| Days | Outcome | Exit gate |
|---|---|---|
| 1–2 | Repo, specs, wireframe, fixtures, test harness | CI green; documented decisions |
| 3–4 | Circuit graph + solver + property tests | 10 fixtures pass |
| 5–6 | Schematic/keyboard editor + mission 1 | Mission 1 truly playable |
| 7–8 | 3D workbench and responsive shell | Inputs map to same domain graph |
| 9–10 | Mission 2/3 + persisted progression | Full vertical slice end-to-end |
| 11 | AI tutor gateway + local fallback | Offline and online paths tested |
| 12 | Accessibility, perf, animations, polish | No critical regressions |
| 13 | Deploy, QA, fresh-device test | Public functional URL |
| 14 | Film and assemble submission | Checklist green |

## Task ownership
Coding agents may implement independent modules, but only one agent should edit shared domain types and contract at a time. Define interface tests before parallel work. Integrate every day.

## Cutline
If behind, cut voice, fancy landing animation, optional cloud backend and decorative rooms first; protect solver, UX, mission completion, accessibility, fallback and judging artifacts.

## Definition of a milestone
Code committed, relevant tests green, at least one screenshot/recording, no speculative success claim, and updates in decision log. Do not jump to stage N+1 because code was generated—verify it.
