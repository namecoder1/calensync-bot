import type { Credentials } from "google-auth-library";
import { redis } from "@/lib/redis";

const KEY_GOOGLE_TOKENS = "google:oauth:tokens";

// Global (legacy) token storage – kept for backward compatibility
export async function setGoogleTokens(tokens: Credentials) {
  await redis.set(KEY_GOOGLE_TOKENS, tokens);
}

export async function getGoogleTokens(): Promise<Credentials | null> {
  const val = await redis.get<Credentials | null>(KEY_GOOGLE_TOKENS);
  return (val as any) ?? null;
}

export async function hasGoogleTokens(): Promise<boolean> {
  return (await redis.exists(KEY_GOOGLE_TOKENS)) === 1;
}

// Per-user token storage (multi-user)
function userKey(userId: string | number) {
  return `${KEY_GOOGLE_TOKENS}:${userId}`;
}

export async function setUserGoogleTokens(userId: string | number, tokens: Credentials) {
  await redis.set(userKey(userId), tokens);
}

export async function getUserGoogleTokens(userId: string | number): Promise<Credentials | null> {
  const val = await redis.get<Credentials | null>(userKey(userId));
  return (val as any) ?? null;
}

export async function hasUserGoogleTokens(userId: string | number): Promise<boolean> {
  return (await redis.exists(userKey(userId))) === 1;
}
