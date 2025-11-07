import { Redis } from "@upstash/redis";

// Usa le variabili d'ambiente UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();
