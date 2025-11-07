import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { setGoogleTokens } from "@/lib/google-tokens";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens ricevuti:", tokens); // Log per verificare i token ricevuti

    oauth2Client.setCredentials(tokens);

    // Salva i token in Redis (Upstash) per uso in produzione
    await setGoogleTokens(tokens as any);
    console.log("Token Google salvati in Redis");

    // Ottieni l'host dall'oggetto req
  const host = req.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const absoluteUrl = `${protocol}://${host}/`;

    // Reindirizza l'utente alla pagina principale dopo l'autenticazione
    return NextResponse.redirect(absoluteUrl);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}