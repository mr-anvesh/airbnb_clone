import logging
import time
import uuid
from typing import Optional

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.core.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request-ID middleware  (unchanged)
# ---------------------------------------------------------------------------

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        logger.info(
            "method=%s path=%s status=%d duration=%.3fs request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration,
            request_id,
        )
        response.headers["X-Request-ID"] = request_id
        return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _client_ip(request: Request) -> str:
    """Best-effort client IP extraction (handles reverse-proxy headers)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _extract_user_id(request: Request) -> Optional[str]:
    """
    Decode the JWT in the Authorization header and return the subject (user_id).
    Returns None if the header is absent, malformed, or the token is invalid.
    We only need the sub claim for bucketing – full DB lookup is not required.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return str(payload.get("sub"))
    except JWTError:
        return None


def _tier_for(method: str, path: str) -> str:
    """
    Map an incoming request to a rate-limit tier name.

    Tiers (most specific first):
      auth       – /api/v1/auth/login, /api/v1/auth/signup
      booking    – POST /api/v1/bookings
      listing    – POST|PUT|DELETE /api/v1/listings*
      user       – any authenticated request (fallback)
      global     – per-IP catch-all applied to every request
    """
    if path in ("/api/v1/auth/login", "/api/v1/auth/signup"):
        return "auth"
    if method == "POST" and path == "/api/v1/bookings":
        return "booking"
    if method in ("POST", "PUT", "DELETE") and (
        path.startswith("/api/v1/listings") or path.startswith("/api/v1/host")
    ):
        return "listing"
    return "user"


# ---------------------------------------------------------------------------
# Rate-limit middleware
# ---------------------------------------------------------------------------

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Two-tier token-bucket rate limiter:

    Tier 1 – global per-IP limit applied to every request.
    Tier 2 – endpoint-specific limit keyed by user_id (or IP if anonymous).

    Both tiers must pass for the request to be forwarded.
    On rejection the middleware returns 429 with a Retry-After header and a
    JSON body so API clients can handle it gracefully.
    """

    # Paths that bypass rate limiting entirely (health checks, static assets)
    _SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path

        # Skip non-API and health-check paths
        if path in self._SKIP_PATHS or path.startswith("/uploads"):
            return await call_next(request)

        method = request.method
        ip = _client_ip(request)
        user_id = _extract_user_id(request)
        identifier = f"user:{user_id}" if user_id else f"ip:{ip}"

        # ------------------------------------------------------------------
        # Tier 1: global per-IP burst protection
        # ------------------------------------------------------------------
        allowed, value = rate_limiter.check(
            tier="global",
            identifier=f"ip:{ip}",
            capacity=settings.RL_GLOBAL_CAPACITY,
            rate_per_minute=settings.RL_GLOBAL_RPM,
        )
        if not allowed:
            return self._too_many(retry_after=value, tier="global", identifier=ip)

        remaining_global = value

        # ------------------------------------------------------------------
        # Tier 2: endpoint-specific per-user/IP limit
        # ------------------------------------------------------------------
        tier = _tier_for(method, path)
        capacity, rpm = self._tier_config(tier)

        allowed, value = rate_limiter.check(
            tier=tier,
            identifier=identifier,
            capacity=capacity,
            rate_per_minute=rpm,
        )
        if not allowed:
            return self._too_many(retry_after=value, tier=tier, identifier=identifier)

        response = await call_next(request)

        # Attach informational headers so clients can see their budget
        response.headers["X-RateLimit-Limit"] = str(capacity)
        response.headers["X-RateLimit-Remaining"] = str(value)
        response.headers["X-RateLimit-Global-Remaining"] = str(remaining_global)
        return response

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _tier_config(tier: str) -> tuple[int, float]:
        """Return (capacity, rpm) for a given tier name."""
        return {
            "auth":    (settings.RL_AUTH_CAPACITY,    settings.RL_AUTH_RPM),
            "booking": (settings.RL_BOOKING_CAPACITY, settings.RL_BOOKING_RPM),
            "listing": (settings.RL_LISTING_CAPACITY, settings.RL_LISTING_RPM),
            "user":    (settings.RL_USER_CAPACITY,    settings.RL_USER_RPM),
        }.get(tier, (settings.RL_USER_CAPACITY, settings.RL_USER_RPM))

    @staticmethod
    def _too_many(retry_after: int, tier: str, identifier: str) -> JSONResponse:
        logger.warning(
            "Rate limit exceeded  tier=%s  identifier=%s  retry_after=%ds",
            tier, identifier, retry_after,
        )
        return JSONResponse(
            status_code=429,
            content={
                "detail": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                }
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Tier": tier,
            },
        )
