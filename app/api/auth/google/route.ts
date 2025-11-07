import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Forza Google a richiedere il consenso
    // Richiedi permessi di lettura e scrittura per poter marcare i task come completati
    scope: [
      "https://www.googleapis.com/auth/tasks",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });

  return NextResponse.redirect(authUrl);
}

export async function POST(req: NextRequest) {
  // Per sicurezza, la gestione del code avviene in /api/auth/callback.
  // Evitiamo di restituire token al client da qui.
  return NextResponse.json({ error: "Use /api/auth/callback" }, { status: 405 });
}