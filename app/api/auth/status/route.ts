import { NextResponse } from "next/server";
import { getGoogleTokens, hasGoogleTokens } from "@/lib/google-tokens";

export async function GET() {
  try {
    const hasTokens = await hasGoogleTokens();
    const tokens = await getGoogleTokens();
    
    return NextResponse.json({
      hasTokens,
      tokenInfo: tokens ? {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        expiryDate: tokens.expiry_date,
        isExpired: tokens.expiry_date ? Date.now() > tokens.expiry_date : null,
        // Non esponiamo i token reali per sicurezza
        accessTokenPreview: tokens.access_token?.substring(0, 10) + "...",
        refreshTokenPreview: tokens.refresh_token?.substring(0, 10) + "...",
      } : null,
      redisConnectionStatus: "ok", // Se arriviamo qui, Redis funziona
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      hasTokens: false,
      redisConnectionStatus: "error"
    }, { status: 500 });
  }
}