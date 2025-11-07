import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ isAdmin: false, reason: "Missing userId" });
  }
  
  const isAuthorized = await isAuthorizedTelegramUser(userId);
  
  return NextResponse.json({ 
    isAdmin: isAuthorized,
    userId: isAuthorized ? userId : null
  });
}