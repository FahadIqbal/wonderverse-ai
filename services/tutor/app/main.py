"""Optional tutor gateway. One endpoint, POST /hint. The key lives only in the server environment."""
import asyncio
import logging
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .provider import SYSTEM_PROMPT, Provider, ProviderUnavailable, StubProvider, build_user_message
from .schemas import MAX_RESPONSE, HintRequest, HintResponse

log = logging.getLogger("tutor")


@dataclass
class Settings:
    api_key: str = ""
    allowed_origins: list[str] = field(default_factory=list)
    rate_limit: int = 20
    rate_window: float = 60.0
    max_body_bytes: int = 8192
    provider_timeout: float = 4.0

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.environ
        return cls(
            api_key=env.get("TUTOR_API_KEY", "").strip(),
            allowed_origins=[o.strip() for o in env.get("TUTOR_ALLOWED_ORIGINS", "").split(",") if o.strip() and o.strip() != "*"],
            rate_limit=int(env.get("TUTOR_RATE_LIMIT", "20")),
            rate_window=float(env.get("TUTOR_RATE_WINDOW_SECONDS", "60")),
            max_body_bytes=int(env.get("TUTOR_MAX_BODY_BYTES", "8192")),
            provider_timeout=float(env.get("TUTOR_PROVIDER_TIMEOUT_SECONDS", "4")),
        )


class RateLimiter:
    """In-memory sliding window per client IP. Single process only; use a shared store if you scale out."""

    def __init__(self, limit: int, window: float, clock=time.monotonic):
        self.limit, self.window, self.clock = limit, window, clock
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = self.clock()
        q = self.hits[key]
        while q and now - q[0] >= self.window:
            q.popleft()
        if not q:
            self.hits.pop(key, None)
            q = self.hits[key]
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


def create_app(settings: Optional[Settings] = None, provider: Optional[Provider] = None, clock=time.monotonic) -> FastAPI:
    cfg = settings or Settings.from_env()
    llm: Provider = provider or StubProvider()
    limiter = RateLimiter(cfg.rate_limit, cfg.rate_window, clock)
    app = FastAPI(title="WonderVerse tutor gateway", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.allowed_origins,
        allow_methods=["POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )

    @app.get("/health")
    async def health() -> dict[str, bool]:
        return {"ok": True, "configured": bool(cfg.api_key)}

    @app.post("/hint", response_model=HintResponse)
    async def hint(request: Request):
        # Order matters: cheap checks first, and no provider call unless everything passes.
        ip = request.client.host if request.client else "unknown"
        if not limiter.allow(ip):
            return JSONResponse({"detail": "rate limit exceeded"}, status_code=429, headers={"Retry-After": str(int(cfg.rate_window))})
        declared = request.headers.get("content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > cfg.max_body_bytes):
            return JSONResponse({"detail": "request too large"}, status_code=413)
        body = b""
        async for chunk in request.stream():
            body += chunk
            if len(body) > cfg.max_body_bytes:
                return JSONResponse({"detail": "request too large"}, status_code=413)
        try:
            req = HintRequest.model_validate_json(body)
        except ValidationError:
            return JSONResponse({"detail": "invalid request"}, status_code=422)
        if not cfg.api_key:
            return JSONResponse({"detail": "tutor model not configured"}, status_code=503)
        try:
            text = await asyncio.wait_for(llm.complete(SYSTEM_PROMPT, build_user_message(req), cfg.api_key), cfg.provider_timeout)
        except asyncio.TimeoutError:
            return JSONResponse({"detail": "provider timeout"}, status_code=504)
        except ProviderUnavailable:
            return JSONResponse({"detail": "provider unavailable"}, status_code=503)
        except Exception:  # never echo provider errors, which may contain request data
            log.warning("provider error")
            return JSONResponse({"detail": "provider error"}, status_code=502)
        text = text.strip() if isinstance(text, str) else ""
        if not text or len(text) > MAX_RESPONSE:
            return JSONResponse({"detail": "provider returned an unusable answer"}, status_code=502)
        return {"text": text}

    return app


app = create_app()  # uvicorn app.main:app
