import { redis } from "@/lib/redis";

/**
 * Semplice rate limiter a finestra fissa basato su Redis.
 * key: chiave logica (es. userId, chatId, IP)
 * limit: numero max di richieste per finestra
 * windowSec: durata finestra in secondi (default 60s)
 */
export async function rateLimit(key: string, limit: number, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const redisKey = `ratelimit:${key}:${bucket}`;

  // INCR e imposta TTL solo al primo incremento
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }

  const remaining = Math.max(0, limit - count);
  const reset = (bucket + 1) * windowSec;

  return {
    allowed: count <= limit,
    remaining,
    reset, // epoch seconds quando la finestra si resetta
    count,
  } as const;
}
