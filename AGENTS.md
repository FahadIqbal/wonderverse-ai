# AGENTS.md — universal instructions for coding assistants

Read `README.md`, `docs/01-PRD.md`, `docs/02-ARCHITECTURE.md`, `docs/06-SIMULATION-ENGINE.md`, `.kiro/specs/wonderverse-mvp/{requirements,design,tasks}.md` before coding. **Do not use existing WonderVerse code built before October 30, 2026 for this competition without disclosure; build a fresh implementation within event window.**

Work in tiny verified slices. First inspect repo; distinguish existing code from plans. State assumptions and make practical choices instead of stalling. Implement required functions end-to-end, not mock visual placeholders. Keep pure physics independent of rendering; use strict TS, Zod boundaries, tests. Never describe unrun tests as passed. Do not install paid/cloud services without necessity. Do not leak secrets. Preserve `.kiro` in repository. Consult `docs/12-DECISION-LOG.md` for constraints and update it after substantive changes.

Every task response should include: files changed, what works, commands/tests actually run and results, limitations and next task. The primary artifact is working source code, not further planning prose.
