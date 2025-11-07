import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const KEY_GOOGLE_TOKENS = "google:oauth:tokens";

export async function DELETE() {
  try {
    await redis.del(KEY_GOOGLE_TOKENS);
    
    return NextResponse.json({
      success: true,
      message: "Token Google rimossi con successo"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}