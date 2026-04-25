"""
Park Naija AI — Cache Layer
-----------------------------
Wraps expensive operations (AI calls, DB-heavy recommendation queries)
with Redis caching.

Cache keys:
  parknaija:predict:{city}:{area_type}:{hour}:{day}     TTL: 30 min
  parknaija:listings:{city}:{area_type}                  TTL: 5 min
  parknaija:score:{city}:{area_type}:{hour}              TTL: 15 min

Use get_cached_prediction() and get_cached_listings() in views
instead of calling logic directly.
"""

import json
import hashlib
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

# ── TTL constants ─────────────────────────────────────────────
TTL_PREDICTION   = 60 * 30   # 30 minutes — predictions don't change often
TTL_LISTINGS     = 60 * 5    # 5 minutes  — listings update regularly
TTL_EXTRACT      = 60 * 60   # 1 hour     — extraction results are stable
TTL_WHATSAPP_BOT = 60 * 2    # 2 minutes  — bot recommendation cache

PREFIX = "parknaija"


def _make_key(*parts) -> str:
    """Build a namespaced, sanitised cache key."""
    raw = ":".join(str(p) for p in parts)
    # Hash long keys to stay under Redis 512-byte limit
    if len(raw) > 200:
        raw = hashlib.md5(raw.encode()).hexdigest()
    return f"{PREFIX}:{raw}"


def cache_get(key: str):
    """Get a value from cache. Returns None on miss or error."""
    try:
        return cache.get(key)
    except Exception as e:
        logger.warning(f"Cache GET error for key={key}: {e}")
        return None


def cache_set(key: str, value, ttl: int):
    """Set a value in cache. Silently swallows errors."""
    try:
        cache.set(key, value, ttl)
    except Exception as e:
        logger.warning(f"Cache SET error for key={key}: {e}")


def cache_delete(key: str):
    try:
        cache.delete(key)
    except Exception as e:
        logger.warning(f"Cache DELETE error for key={key}: {e}")


def invalidate_listings_cache(city: str):
    """Call this when a listing is created/updated/deleted."""
    for area in ["commercial", "residential", "market", "mixed", "religious", "all"]:
        cache_delete(_make_key("listings", city, area))
    logger.info(f"Invalidated listings cache for city={city}")


# ── Cached prediction ─────────────────────────────────────────

def get_cached_prediction(city: str, area_type: str, hour: int, day_name: str) -> dict:
    """
    Returns availability prediction, using cache when possible.
    Cache key includes hour (rounded to nearest 2hr block) and day.
    """
    from apps.predictions.logic import predict_availability
    from datetime import datetime

    # Round hour to 2-hour block for better cache hit rate
    # e.g. 8:45 and 9:10 both map to block "8"
    hour_block = (hour // 2) * 2
    key = _make_key("predict", city, area_type, hour_block, day_name)

    cached = cache_get(key)
    if cached is not None:
        logger.debug(f"Cache HIT: prediction {city}/{area_type}/{hour_block}/{day_name}")
        return cached

    # Build a representative datetime for this block
    target_dt = datetime.now().replace(hour=hour_block, minute=0, second=0, microsecond=0)
    result = predict_availability(city=city, area_type=area_type, target_dt=target_dt)

    cache_set(key, result, TTL_PREDICTION)
    logger.debug(f"Cache MISS: computed prediction {city}/{area_type}/{hour_block}/{day_name}")
    return result


# ── Cached listings query ─────────────────────────────────────

def get_cached_listings(city: str, area_type: str = "all") -> list:
    """
    Returns active parking spaces for a city, using cache.
    Each listing is returned as a dict (not a model instance) for safe serialization.
    """
    from apps.listings.models import ParkingSpace

    key = _make_key("listings", city, area_type)

    cached = cache_get(key)
    if cached is not None:
        logger.debug(f"Cache HIT: listings {city}/{area_type}")
        return cached

    qs = ParkingSpace.objects.filter(city=city, status=ParkingSpace.Status.ACTIVE)
    if area_type != "all":
        qs = qs.filter(area_type=area_type)

    spaces = list(qs.values(
        "id", "name", "address", "city", "area_type",
        "latitude", "longitude", "capacity", "price_per_hour",
        "price_is_negotiable", "available_from", "available_until",
        "has_security", "is_covered", "has_cctv", "is_verified",
        "notes", "source",
    ))

    # Serialize time fields for JSON safety
    for space in spaces:
        if space.get("available_from"):
            space["available_from"] = str(space["available_from"])
        if space.get("available_until"):
            space["available_until"] = str(space["available_until"])
        space["price_per_hour"] = float(space["price_per_hour"])

    cache_set(key, spaces, TTL_LISTINGS)
    logger.debug(f"Cache MISS: queried {len(spaces)} listings {city}/{area_type}")
    return spaces


# ── Cache stats (for admin / monitoring) ─────────────────────

def get_cache_stats() -> dict:
    """Returns basic cache health info. Used in admin dashboard."""
    try:
        # Write and read a test key
        test_key = _make_key("health_check")
        cache.set(test_key, "ok", 10)
        alive = cache.get(test_key) == "ok"
        return {"status": "ok" if alive else "error", "backend": str(cache.__class__.__name__)}
    except Exception as e:
        return {"status": "error", "error": str(e)}
