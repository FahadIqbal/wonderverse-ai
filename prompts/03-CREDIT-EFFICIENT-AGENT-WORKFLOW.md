# Credit-efficient development protocol

1. Start each session with a one-paragraph objective + relevant 2–4 docs, not repeated whole specification.
2. Ask agent to inspect current source and diff before generating code. Do not recreate existing modules.
3. Keep tasks bounded to a testable slice. State exact acceptance test and desired filenames.
4. Use deterministic templates and pure functions for repeated logic; spend LLM calls on decisions that need reasoning.
5. Avoid regenerating entire application because of one UI detail. Request targeted patches with measured screenshots/test failures.
6. Use a cheap local fallback for tutoring; reserve model API for explicit demonstration.
7. Commit after passing slices and keep a concise decision log. Compress context with AGENTS.md and .kiro steering.
8. Cache meshes/fixtures, use authored missions and procedural assets, and avoid speculative external services.
9. Prevent parallel agents from editing shared contracts concurrently.
10. Inspect actual run output. Prefer one verified feature over many apparent features.

Example command: "Implement T03 only. Read docs/06, current domain files and 10 fixtures. Do not touch rendering. Return exact tests run and results; update task status only if passing."
