import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Verifica sessione Telegram – evita che qualcuno forzi userId arbitrario
  const ok = await isAuthorizedTelegramUser(userId);
  if (!ok) {
    return NextResponse.json({ error: "Telegram session not found" }, { status: 403 });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state: userId, // Propaghiamo l'id utente per salvarne i token nel callback
  });

  return NextResponse.redirect(authUrl);
}

export async function POST(req: NextRequest) {
  // Per sicurezza, la gestione del code avviene in /api/auth/callback.
  // Evitiamo di restituire token al client da qui.
  return NextResponse.json({ error: "Use /api/auth/callback" }, { status: 405 });
}