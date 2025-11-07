import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica se l'utente Telegram è autorizzato
 * Controlla sia la lista degli utenti autorizzati che la sessione attiva
 */
export async function isAuthorizedTelegramUser(userId?: string | number): Promise<boolean> {
  if (!userId) return false;
  
  const userIdStr = userId.toString();
  
  // Controlla la lista degli utenti autorizzati
  const authorizedUsers = process.env.TELEGRAM_AUTHORIZED_USERS?.split(',')
    .map(id => id.trim())
    .filter(Boolean) || [];
  
  if (!authorizedUsers.includes(userIdStr)) {
    return false;
  }
  
  // Controlla se ha una sessione attiva
  try {
    const session = await redis.get(`telegram:session:${userIdStr}`);
    return !!session;
  } catch (error) {
    console.error("Error checking Telegram session:", error);
    return false;
  }
}

/**
 * Middleware per proteggere gli endpoint che richiedono autorizzazione Telegram
 */
export function createTelegramAuthMiddleware(handler: (req: NextRequest, userId: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      // Cerca l'ID utente nella query string o nel body
      const url = new URL(req.url);
      let userId = url.searchParams.get('userId');
      
      if (!userId && req.method === 'POST') {
        try {
          const body = await req.json();
          userId = body.userId;
        } catch {
          // Ignore parsing errors
        }
      }
      
      if (!userId) {
        return NextResponse.json({
          ok: false,
          error: "Parametro userId mancante. Effettua prima l'autenticazione Telegram."
        }, { status: 401 });
      }
      
      const isAuthorized = await isAuthorizedTelegramUser(userId);
      
      if (!isAuthorized) {
        return NextResponse.json({
          ok: false,
          error: "Non autorizzato. Effettua prima l'autenticazione Telegram o contatta l'amministratore."
        }, { status: 403 });
      }
      
      return handler(req, userId);
    } catch (error: any) {
      return NextResponse.json({
        ok: false,
        error: `Errore di autorizzazione: ${error.message}`
      }, { status: 500 });
    }
  };
}

/**
 * Ottiene informazioni sull'utente dalla sessione
 */
export async function getTelegramUserSession(userId: string): Promise<any> {
  try {
    return await redis.get(`telegram:session:${userId}`);
  } catch (error) {
    console.error("Error getting Telegram session:", error);
    return null;
  }
}