import os
import time
import threading
from collections import defaultdict

from fastapi import HTTPException, Request

RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "10"))
RATE_LIMIT_WINDOW_S = int(os.environ.get("RATE_LIMIT_WINDOW_S", "60"))
_rate_limit_lock = threading.Lock()
_rate_limit_log: dict[str, list[float]] = defaultdict(list)


def client_ip(request: Request) -> str:
    # Caddy sets X-Forwarded-For when reverse-proxying in production;
    # request.client.host would otherwise just be Caddy's own container.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request):
    ip = client_ip(request)
    now = time.time()
    with _rate_limit_lock:
        recent = [t for t in _rate_limit_log[ip] if now - t < RATE_LIMIT_WINDOW_S]
        if len(recent) >= RATE_LIMIT_MAX_REQUESTS:
            raise HTTPException(status_code=429, detail="Too many requests — slow down")
        recent.append(now)
        _rate_limit_log[ip] = recent
