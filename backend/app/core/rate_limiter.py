"""
Token-bucket rate limiter backed by Redis.

Each bucket is stored as a Redis hash { tokens: float, ts: float }.
An atomic Lua script handles read-refill-consume in a single round-trip,
so there are no race conditions even under concurrent load.

Bucket key format:  rl:{tier}:{identifier}
  tier       – logical name for the limit group (e.g. "global", "booking_write")
  identifier – user_id (authenticated) or IP address (anonymous)
"""

import logging
import time
from typing import Optional

import redis as redis_lib

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lua script – atomically refill + consume one token
# ---------------------------------------------------------------------------
_LUA_SCRIPT = """
local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])   -- tokens per second
local now      = tonumber(ARGV[3])

local vals     = redis.call('HMGET', key, 'tokens', 'ts')
local tokens   = tonumber(vals[1])
local last_ts  = tonumber(vals[2])

if tokens == nil or last_ts == nil then
    tokens  = capacity
    last_ts = now
end

local elapsed   = math.max(0, now - last_ts)
local new_tokens = math.min(capacity, tokens + elapsed * rate)
local ttl       = math.ceil(capacity / rate) + 30

if new_tokens >= 1.0 then
    local remaining = new_tokens - 1.0
    redis.call('HMSET', key, 'tokens', remaining, 'ts', now)
    redis.call('EXPIRE', key, ttl)
    return {1, math.floor(remaining)}
else
    local retry_after = math.ceil((1.0 - new_tokens) / rate)
    redis.call('HMSET', key, 'tokens', new_tokens, 'ts', now)
    redis.call('EXPIRE', key, ttl)
    return {0, retry_after}
end
"""


class TokenBucketRateLimiter:
    """
    Singleton wrapper around a Redis client + preloaded Lua script.

    Fails open: if Redis is unavailable every request is allowed, so the
    site stays up even when the cache layer is down.
    """

    def __init__(self) -> None:
        self._client: Optional[redis_lib.Redis] = None
        self._sha: Optional[str] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _connect(self) -> Optional[redis_lib.Redis]:
        try:
            client = redis_lib.from_url(
                settings.REDIS_URL,
                decode_responses=False,  # Lua returns bytes
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            client.ping()
            self._sha = client.script_load(_LUA_SCRIPT)
            self._client = client
            logger.info("Rate limiter: Redis connected, Lua script loaded (sha=%s)", self._sha[:8])
        except Exception as exc:
            logger.warning("Rate limiter: Redis unavailable – failing open. %s", exc)
            self._client = None
        return self._client

    def _get_client(self) -> Optional[redis_lib.Redis]:
        if self._client is None:
            return self._connect()
        # Quick health check – reconnect if connection dropped
        try:
            self._client.ping()
        except Exception:
            self._client = None
            return self._connect()
        return self._client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(
        self,
        tier: str,
        identifier: str,
        capacity: int,
        rate_per_minute: float,
    ) -> tuple[bool, int]:
        """
        Check whether an incoming request should be allowed.

        Parameters
        ----------
        tier            Logical name for the bucket group (e.g. "global").
        identifier      Per-user or per-IP string used as bucket key.
        capacity        Maximum burst tokens (bucket size).
        rate_per_minute Sustained throughput (tokens added per minute).

        Returns
        -------
        (allowed, value)
          allowed=True  → value = remaining tokens in bucket
          allowed=False → value = Retry-After seconds
        """
        client = self._get_client()
        if client is None:
            return True, capacity  # fail open

        key = f"rl:{tier}:{identifier}"
        rate_per_second = rate_per_minute / 60.0
        now = time.time()

        try:
            result = client.evalsha(
                self._sha,
                1,           # number of keys
                key,
                str(capacity),
                str(rate_per_second),
                str(now),
            )
            allowed = int(result[0]) == 1
            value = int(result[1])
            return allowed, value

        except redis_lib.exceptions.NoScriptError:
            # Script was evicted (SCRIPT FLUSH or Redis restart); reload and retry once
            try:
                self._sha = client.script_load(_LUA_SCRIPT)
                return self.check(tier, identifier, capacity, rate_per_minute)
            except Exception as exc:
                logger.error("Rate limiter: script reload failed: %s", exc)
                return True, capacity

        except Exception as exc:
            logger.warning("Rate limiter: check failed, failing open: %s", exc)
            return True, capacity


# Singleton – imported by middleware
rate_limiter = TokenBucketRateLimiter()
