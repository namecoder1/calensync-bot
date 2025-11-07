import type { Credentials } from "google-auth-library";
import { redis } from "@/lib/redis";

const KEY_GOOGLE_TOKENS = "google:oauth:tokens";

export async function setGoogleTokens(tokens: Credentials) {
  // Salvataggio semplice: l'oggetto viene serializzato in JSON dal client Upstash
  await redis.set(KEY_GOOGLE_TOKENS, tokens);
}

export async function getGoogleTokens(): Promise<Credentials | null> {
  const val = await redis.get<Credentials | null>(KEY_GOOGLE_TOKENS);
  return (val as any) ?? null;
}

export async function hasGoogleTokens(): Promise<boolean> {
  return (await redis.exists(KEY_GOOGLE_TOKENS)) === 1;
}
