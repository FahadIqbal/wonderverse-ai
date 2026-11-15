# Tutor gateway (optional)

The app works without this service: with no `VITE_TUTOR_URL` the browser uses the offline Local guide.
This gateway exists so a model key can stay on a server. It never receives circuit graphs, only the bounded
`TutorContext` built from the solver report (see `src/domain/learning/tutor/schemas.ts`).

## Status

* `POST /hint` validation, size limit, per-IP rate limit, CORS allowlist, provider timeout and the no-key 503 are implemented and tested.
* **No model provider is implemented.** `app/provider.py` ships `StubProvider`, a placeholder that always answers 503. To enable a model, implement the `Provider` protocol with a vetted client, then review that vendor's terms, data handling and child-safety options. Nothing here has been run against a real model.

## Run

```bash
cd services/tutor
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # .env is git-ignored; export its values in your shell or process manager
pytest
uvicorn app.main:app --port 8787
```

Then build the web app with `VITE_TUTOR_URL=http://localhost:8787` and add the web origin to `TUTOR_ALLOWED_ORIGINS`.

## Contract

`POST /hint` with `{ "context": TutorContext, "question"?: string (<= 200 chars) }` returns `{ "text": string (<= 600) }`.

| Status | Meaning |
| --- | --- |
| 200 | Provider answer (the browser still validates it). |
| 413 | Body over `TUTOR_MAX_BODY_BYTES`. |
| 422 | Body does not match the schema (unknown keys are rejected). |
| 429 | Per-IP rate limit; `Retry-After` is set. |
| 502 / 503 / 504 | Provider failed, key or provider missing, or timeout. The browser falls back to the Local guide. |

## Safety and privacy

* The key is read from `TUTOR_API_KEY` only. It is never sent to the browser and never logged. Rotate it by changing the variable and restarting.
* The learner question is passed to the provider as a JSON data field, not as instructions. The browser screens unsafe, off-topic and prompt-injection questions locally and does not send them.
* Request bodies and learner questions are not logged. The service stores nothing.
* The browser validates every answer (schema, length, markup, blocked content, numeric grounding) and falls back to the Local guide if it fails. The gateway does not do that for you.
* The rate limiter is in memory and keyed on the socket peer IP. Behind a proxy that is the proxy's IP; put real per-client limiting at the proxy or use a shared store.
* Serve over HTTPS in any deployment. The CORS allowlist rejects `*`.
