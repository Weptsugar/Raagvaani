import logging
import redis.asyncio as aioredis
from app.core.config import REDIS_URL

logger = logging.getLogger(__name__)

# Global Redis instance, initialized during startup
redis_client: aioredis.Redis | None = None

async def init_redis():
    global redis_client
    try:
        logger.info(f"Initializing Redis connection pool at {REDIS_URL}...")
        # aioredis connection pool
        pool = aioredis.ConnectionPool.from_url(
            REDIS_URL, 
            encoding="utf-8", 
            decode_responses=True,
            max_connections=100
        )
        redis_client = aioredis.Redis(connection_pool=pool)
        # Test connection
        await redis_client.ping()
        logger.info("Successfully connected to Redis!")
    except Exception as e:
        logger.error(f"Failed to connect to Redis at {REDIS_URL}: {e}")
        # Return a dummy client or let it raise if critical. We will raise as Redis is critical.
        raise e

async def close_redis():
    global redis_client
    if redis_client:
        logger.info("Closing Redis connection pool...")
        await redis_client.close()
        logger.info("Redis connection pool closed.")

def get_redis() -> aioredis.Redis:
    if redis_client is None:
        raise RuntimeError("Redis client is not initialized. Make sure init_redis() was called on startup.")
    return redis_client
