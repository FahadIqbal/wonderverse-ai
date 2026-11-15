# Kiro usage record

Purpose: an honest account of how Kiro was used in this build, for the Devpost "Kiro use" field and for judges. Written on 2026-11-15 from evidence in the repository only. The author of this file did not watch the build happen, so each statement is labelled **Verified in repo**, **Inferred**, or **Cannot verify**.

## 1. Kiro features that appear in the repo

| Feature | Evidence (path) | Status |
|---|---|---|
| Specs: requirements | `.kiro/specs/wonderverse-mvp/requirements.md`. EARS-style statements R1 to R9 with a traceability line to docs/07. | Verified in repo |
| Specs: design | `.kiro/specs/wonderverse-mvp/design.md`. Data flow `CircuitGraph` reducer to `solveCircuit` to `SimulationReport` to mission evaluator, scene, schematic and tutor, plus a component plan. | Verified in repo |
| Specs: tasks | `.kiro/specs/wonderverse-mvp/tasks.md`. Tasks T01 to T14 with `[x]`, `[-]` and `[~]` status markers. | Verified in repo |
| Task execution metadata | `.kiro/specs/wonderverse-mvp/tasks.meta.json`. See section 2. | Verified in repo |
| Steering | `.kiro/steering/product.md`, `tech.md`, `structure.md`, `quality.md`. They set the stack, folder layout, definition of done and "render circuit state only from computed report". | Verified in repo |
| Hooks | No `.kiro/hooks/` directory and no `*.kiro.hook` file exists in the workspace. | **Not used** |
| MCP | No `.kiro/settings/mcp.json` or any MCP config in the workspace. | **Not used** |
| Powers | None referenced in the workspace. | **Not used** |

`git ls-files .kiro` (run 2026-11-15) lists `design.md`, `requirements.md`, `tasks.md`, `tasks.meta.json` and the four steering files, so `.kiro/` is tracked and is not ignored by `.gitignore`.

## 2. What `tasks.meta.json` shows

The file has an `executionHistory` object keyed by task title. It has entries for **T05 to T14 only**. T01 to T04 have no entry (reason unknown; they may have been done outside the task runner, or before metadata was recorded).

Each entry holds `executionId`, `chatSessionId` and a Unix `timestamp` (milliseconds). Facts read from it:

- One `chatSessionId` (`sess_6ea3615a-...`) appears on every entry.
- Every task from T05 to T14 has a first entry at 2026-11-15 04:48:03-04:48:04 UTC, all with `executionId` `7beabf88-...`, about 30 ms apart. That pattern is consistent with the tasks being queued together in one action. This is an inference, not something the file states.
- Later entries for the same `executionId` are spaced out: T06 at 04:52 (about 4 minutes after queueing), T07 at 04:57 and 05:01, T08 at 05:01 and 06:32, T09 at 06:32 and 06:47, T10 at 06:47 and 06:56, T11 at 06:56 and 07:10, T12 at 07:10 and 07:25 (all UTC, 2026-11-15, approximate; hour values come from the timestamps). Entries chain end to end, which suggests the tasks ran one after another. This is an inference.
- T13 has three different `executionId` values after the queueing entry (`ce4e...` at 08:45 and 08:48 UTC, `6eda...` at 08:53, `d638...` at 09:11 and 09:22), so it was run in more than one pass. T14 has a new `executionId` at 12:52 UTC.
- `pbtResults` is empty `{}`. No result was recorded in the Kiro property-test tracker, even though fast-check tests exist and run in Vitest.

What the file cannot tell us: which model or agent did the work, how many prompts the author wrote, what the author changed by hand, or whether any run was retried because it failed.

Update (closing pass, 2026-11-15): `git status` shows no uncommitted change under `.kiro/`; the T13 `[x]` and T14 `[-]` marks and their metadata entries were committed in d87e132 and cd0cdfb. `git ls-files .kiro` lists 8 files (3 spec files, `tasks.meta.json`, 4 steering files). The closing pass itself ran as a separate agent session; it did not change anything under `.kiro/`, and its tool calls are not recorded in `tasks.meta.json` (the file is written by the task runner, which was not used for this pass).

## 3. How the spec workflow was applied (from the repo)

- **Spec first.** The requirements (R1 to R9), design and tasks existed before the code. All three spec files carry the same file timestamp, 2026-11-14 14:28 local, earlier than the first commit (2026-11-15). **Cannot verify** whether Kiro generated these files or the author wrote or pasted them in; `AGENTS.md` and `prompts/` show the author also wrote agent instructions by hand.
- **Task-by-task.** `tasks.md` ends with the rule "inspect dependency prerequisites, implement, run tests, report files/commands and actual outcomes, then update checklist." `docs/12-DECISION-LOG.md` has one entry per task (T01 to T04 share one entry, T05 to T13 have their own) with "Shipped", "Decisions", "Tests run (actual)", "Not verified" and "Next". That layout matches the rule, so the decision log is the best record of what each task changed. These entries were written in the build itself, so treat them as the author's and agent's own reports, not independent verification.
- **Traceability.** Requirements R1 to R9 map to the e2e specs in `e2e/` (for example R8 erase, R7 WebGL-off fallback, R5 tutor with no key) as docs/18 lists.
- **Steering effects visible in code.** The steering says the solver is a pure domain module and the renderer consumes reports only; `src/domain/circuit` has no rendering imports (README and ADR-002). The steering says "render circuit state only from computed report"; E2E checks `data-lit` against the diagnostic row. The steering says justified dependency deviations go in the decision log; the log has "Dependency (dev only): axe-core" and similar entries.
- **Sub-agent execution.** The task runner executes each task through an agent that is told to do one task, write tests, run them and report back. This is how the T05 to T14 metadata is structured (a separate `executionId` per run). **Cannot verify** the internal prompts or tool calls.

## 4. Changes the spec/steering process visibly caused

Each is documented in the repo; none is a claim about how much faster or better the result is.

- **Solver design.** ADR-006 records that a first BFS path-search prototype lit dangling lamps and mis-summed parallel resistance, and that it was replaced with nets and nodal analysis. This follows the "test solver invariants" steering.
- **Fresh-clone and CI failures were recorded, not hidden.** `autoprefixer` missing (commit 3608a86), invalid `vercel.json` (commit d87e132). See docs/18 and the commit messages.
- **Honest "Not verified" blocks** in every decision-log entry, and `docs/17` marking every manual check `NOT DONE`.

## 5. What cannot be verified from the repo

- That every line of code was produced inside Kiro. The repo does not contain a Kiro session transcript. `prompts/00-MASTER-START-PROMPT.md` opens with "paste into Kiro / Codex / Claude / other coding agent", so the prompts are tool-agnostic, and the repo does not show which tool received them.
- Credits used, session counts, or model names.
- Whether Kiro "vibe" chat was used outside spec tasks.
- The git history was five commits when this record was written (seven by the closing pass, all dated 2026-11-15; the closing-pass commit makes eight) (`086b4fc` has T01 to T12 in one commit), so history does not show per-task progress. The event-window requirement in `AGENTS.md` is supported by the commit dates (2026-11-15, inside the Oct 30 to Dec 4 submission period) and by `docs/12-DECISION-LOG.md`. No pre-event code was reused according to the README; the author must confirm this.
- **Date mismatch (resolved in the final pass).** The decision log and docs/18 used to date T09 to T12 as 2026-11-16 to 2026-11-19, while all git commits are dated 2026-11-15 and `tasks.meta.json` puts the T05 to T12 executions on 2026-11-15. The log and docs/18 now use 2026-11-15, matching `git log --date=iso`.
- Hooks, MCP, Powers and other Kiro features: none are configured in `.kiro/`. Do not claim them. Re-checked in the closing pass: `.kiro/` contains only `specs/` and `steering/`; there is no `hooks/` or `settings/`.

## 6. Suggested wording for Devpost

"We used Kiro specs and steering from the start: requirements R1 to R9 in EARS form, a design document, and a T01 to T14 task list, with four steering files for stack, structure, quality and product. Tasks were executed one at a time with recorded execution history, and each task has a decision-log entry listing what was tested and what was not. We did not use Kiro hooks or MCP."

Only use "from the start" and "recorded execution history" if the author agrees they are accurate.

## 7. Author's additions (optional, fill in yourself)

Add only things you actually did. Suggested prompts:

- Which Kiro surfaces you used that leave no file in the repo (chat, autopilot or supervised mode, specs generation, the agent hooks UI):
- Moments where Kiro changed the plan or caught a bug, with the date:
- Things you corrected by hand after Kiro's output:
- Number of Kiro sessions, credits used (optional):
- Whether T01 to T04 were run through the task runner:
- Anything in section 5 that you can confirm:
