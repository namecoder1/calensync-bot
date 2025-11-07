import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { setGoogleTokens, setUserGoogleTokens } from "@/lib/google-tokens";
import { createClient } from "@/supabase/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // contiene telegram userId

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens ricevuti:", tokens); // Log per verificare i token ricevuti

    oauth2Client.setCredentials(tokens);

    // Se abbiamo lo state, salviamo i token per-utente
    if (state) {
      await setUserGoogleTokens(state, tokens as any);
      console.log("Token Google salvati per utente:", state);

      // Upsert utente su Supabase
      try {
        const supabase = await createClient();
        await supabase.from('users').upsert({
          telegram_id: state,
          google_connected: true,
          google_connected_at: new Date().toISOString(),
        }, { onConflict: 'telegram_id' });
      } catch (e) {
        console.warn("Supabase upsert user failed", e);
      }
    }

    // Mantieni anche i token globali (retrocompatibilità temporanea)
    await setGoogleTokens(tokens as any);
    console.log("Token Google globali salvati in Redis");

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