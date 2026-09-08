import json
import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> redis.Redis | None:
        if self._client is None:
            try:
                self._client = redis.from_url(
                    settings.REDIS_URL, decode_responses=True
                )
                self._client.ping()
            except Exception:
                logger.warning("Redis connection failed")
                self._client = None
        return self._client

    def get(self, key: str) -> dict | None:
        if not self.client:
            return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None

    def set(self, key: str, value: dict, ttl: int = 300) -> None:
        if not self.client:
            return
        try:
            self.client.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass

    def delete(self, key: str) -> None:
        if not self.client:
            return
        try:
            self.client.delete(key)
        except Exception:
            pass

    def invalidate(self, pattern: str) -> None:
        if not self.client:
            return
        try:
            for key in self.client.scan_iter(match=pattern):
                self.client.delete(key)
        except Exception:
            pass


cache_service = CacheService()
