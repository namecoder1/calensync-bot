import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/reminder-dispatcher";
import { isAuthorizedTelegramUser, getTelegramUserSession } from "@/lib/telegram-auth";

// Non cache: vogliamo esecuzione a ogni chiamata
export const dynamic = "force-dynamic";

// Funzione principale che gestisce il dispatch
async function handleDispatch(req: NextRequest) {
  try {
    // Controlla se c'è un userId (chiamata manuale da utente)
    const url = new URL(req.url);
    let userId = url.searchParams.get('userId');
    
    if (!userId && req.method === 'POST') {
      try {
        const body = await req.json();
        userId = body.userId;
      } catch {
        // Body non JSON o vuoto, ignora
      }
    }
    
    let mode: 'auto' | 'manual' = 'auto';
    let triggeredBy = 'cron';
    
    // Se c'è userId, verifica autorizzazione e usa modalità manuale
    if (userId) {
      const isAuthorized = await isAuthorizedTelegramUser(userId);
      
      if (!isAuthorized) {
        return NextResponse.json({
          ok: false,
          error: "Non autorizzato. Effettua prima l'autenticazione Telegram."
        }, { status: 403 });
      }
      
      mode = 'manual';
      const userSession = await getTelegramUserSession(userId);
      triggeredBy = `${userId} (${userSession?.firstName || 'Unknown'})`;
      console.log(`[MANUAL] Dispatch triggered by user ${triggeredBy}`);
    } else {
      console.log(`[AUTO] Dispatch triggered by cron/automated process`);
    }
    
    // Esegui il dispatcher
    const res = await dispatchDueReminders(new Date(), { mode });
    
    // Log dell'attività
    console.log(`Dispatch [${mode.toUpperCase()}] completed: sent=${res.sent}, skipped=${res.skipped}, errors=${res.errors.length}`);
    
    return NextResponse.json({ 
      ok: true, 
      ...res,
      mode,
      triggeredBy
    });
  } catch (e: any) {
    console.error(`Dispatch error:`, e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || String(e) 
    }, { status: 500 });
  }
}

// Entrambi GET e POST supportano sia modalità auto che manuale
export const GET = handleDispatch;
export const POST = handleDispatch;
