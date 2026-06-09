import json
from collections.abc import Callable
from datetime import date, datetime
from uuid import UUID

from redis import Redis
from redis.exceptions import RedisError

from app.config import get_settings


def _json_default(value: object) -> str:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _client() -> Redis:
    return Redis.from_url(get_settings().redis_url, decode_responses=True)


def get_json(key: str) -> object | None:
    try:
        value = _client().get(key)
    except RedisError:
        return None
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def set_json(key: str, value: object, ttl_seconds: int | None = None) -> None:
    try:
        _client().set(key, json.dumps(value, default=_json_default), ex=ttl_seconds)
    except RedisError:
        return


def delete_keys(*keys: str) -> None:
    if not keys:
        return
    try:
        _client().delete(*keys)
    except RedisError:
        return


def delete_pattern(pattern: str) -> None:
    try:
        client = _client()
        keys = list(client.scan_iter(match=pattern, count=100))
        if keys:
            client.delete(*keys)
    except RedisError:
        return


def cached(key: str, ttl_seconds: int, loader: Callable[[], object]) -> object:
    value = get_json(key)
    if value is not None:
        return value
    value = loader()
    set_json(key, value, ttl_seconds)
    return value
