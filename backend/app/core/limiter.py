import time
import logging
from fastapi import HTTPException, status, Request
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

async def rate_limiter(request: Request, limit: int = 60, window: int = 60):
    """
    Sliding window rate limiter using Redis.
    Enforces a rate limit of `limit` requests per `window` seconds per user.
    """
    # Identify user by X-User-ID header, fallback to client IP
    user_id = request.headers.get("x-user-id") or request.headers.get("X-User-ID")
    if not user_id or not user_id.strip():
        identifier = request.client.host if request.client else "unknown_ip"
    else:
        identifier = user_id.strip()

    redis = get_redis()
    now = time.time()
    key = f"rate_limit:{identifier}"
    clear_before = now - window

    try:
        async with redis.pipeline(transaction=True) as pipe:
            # 1. Remove elements older than the sliding window start
            pipe.zremrangebyscore(key, 0, clear_before)
            # 2. Get the number of elements (requests) currently in the window
            pipe.zcard(key)
            # 3. Add the current timestamp to the sorted set
            pipe.zadd(key, {str(now): now})
            # 4. Refresh key TTL
            pipe.expire(key, window)
            
            # Execute pipeline
            _, current_requests, _, _ = await pipe.execute()
            
        if current_requests > limit:
            logger.warning(f"Rate limit exceeded for user: {identifier}. Requests in window: {current_requests}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again in a moment."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rate limiter error: {e}. Allowing request to pass through.")
        # Under production failures, fail-open to not block users
        pass
