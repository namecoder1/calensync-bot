import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/supabase/server";
import { redis } from "@/lib/redis";

// Tipi per i messaggi Telegram
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  message_thread_id?: number;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Funzione per gestire il comando /start
async function handleStartCommand(chatId: number, user?: TelegramUser): Promise<void> {
  const firstName = user?.first_name || "utente";
  const message = `👋 Ciao ${firstName}! Benvenuto in CalenSync!

🔗 Per iniziare, apri la Mini App:
Tocca il pulsante qui sotto o vai al menu del bot.

📅 Cosa puoi fare:
• Connetti il tuo Google Calendar
• Ricevi promemoria automatici su Telegram
• Gestisci i tuoi eventi in modo semplice

❓ Hai bisogno di aiuto?
Usa il comando /help per vedere tutti i comandi disponibili.`;

  const miniAppUrl = process.env.NEXT_PUBLIC_MINI_APP_URL || process.env.MINI_APP_URL || null;
  await sendTelegramMessage(chatId.toString(), message, miniAppUrl ? {
    reply_markup: {
      inline_keyboard: [[{ text: 'Apri Mini App', url: miniAppUrl }]]
    }
  } : undefined);
}

// Funzione per gestire il comando /help
async function handleHelpCommand(chatId: number): Promise<void> {
  const message = `❓ Comandi disponibili:

/start - Avvia il bot e mostra il messaggio di benvenuto
/help - Mostra questo menu di aiuto
/register - Registra questo gruppo per i promemoria

🔗 Mini App:
Per usare tutte le funzionalità, apri la Mini App di CalenSync dal menu del bot.

📅 Funzionalità principali:
• Connessione con Google Calendar
• Promemoria automatici per eventi
• Gestione eventi e attività
• Sincronizzazione in tempo reale

🛠️ Supporto:
Se hai problemi, contatta l'amministratore del bot.`;

  const miniAppUrl = process.env.NEXT_PUBLIC_MINI_APP_URL || process.env.MINI_APP_URL || null;
  await sendTelegramMessage(chatId.toString(), message, miniAppUrl ? {
    reply_markup: {
      inline_keyboard: [[{ text: 'Apri Mini App', url: miniAppUrl }]]
    }
  } : undefined);
}

// Comando /register: registra il gruppo (e opzionalmente il topic del messaggio) per l'utente che ha inviato il comando
async function handleRegisterCommand(message: TelegramMessage): Promise<void> {
  const user = message.from;
  const chat = message.chat;
  if (!user) return;
  const userId = user.id.toString();

  // Verifica sessione telegram (utente deve aver aperto la mini app prima)
  const session = await redis.get(`telegram:session:${userId}`);
  if (!session) {
    await sendTelegramMessage(chat.id.toString(), "⚠️ Apri prima la Mini App del bot per associare il tuo account.");
    return;
  }

  const supabase = await createClient();
  const base = {
    telegram_id: userId,
    group_chat_id: chat.id.toString(),
    group_title: chat.title ?? chat.username ?? null,
    group_type: chat.type,
    is_active: true,
  } as const;

  // Upsert riga base (topic_id null)
  const { error: gErr } = await supabase
    .from('user_telegram_groups')
    .upsert({ ...base, topic_id: null, topic_name: null }, { onConflict: 'telegram_id,group_chat_id,topic_id' });
  if (gErr) {
    await sendTelegramMessage(chat.id.toString(), `❌ Errore registrazione gruppo: ${gErr.message}`);
    return;
  }

  // Se il messaggio è dentro un topic (supergruppo con message_thread_id) registriamo anche il topic
  if (message.message_thread_id != null) {
    const topicId = message.message_thread_id;
    const { error: tErr } = await supabase
      .from('user_telegram_groups')
      .upsert({ ...base, topic_id: topicId, topic_name: `Topic ${topicId}` }, { onConflict: 'telegram_id,group_chat_id,topic_id' });
    if (tErr) {
      await sendTelegramMessage(chat.id.toString(), `⚠️ Gruppo ok ma errore registrazione topic: ${tErr.message}`);
      return;
    }
  }

  await sendTelegramMessage(chat.id.toString(), "✅ Gruppo registrato! Torna nella Mini App per selezionarlo e fare il mapping.");
}

// Funzione per gestire comandi sconosciuti
async function handleUnknownCommand(chatId: number, command: string): Promise<void> {
  const message = `❌ Comando sconosciuto: ${command}

📋 Comandi disponibili:
/start - Avvia il bot
/help - Mostra l'aiuto
/register - Registra questo gruppo per i promemoria

💡 Suggerimento:
Per usare tutte le funzionalità, apri la Mini App dal menu del bot!`;

  await sendTelegramMessage(chatId.toString(), message);
}

export async function POST(req: NextRequest) {
  try {
    const body: TelegramUpdate = await req.json();
    
    // Verifica che ci sia un messaggio
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    // Rate limit per chat: max 20 richieste/minuto
    const rl = await rateLimit(`tg-webhook:${chatId}`, 20, 60);
    if (!rl.allowed) {
      // Non generare errori verso Telegram, semplicemente ignora
      return NextResponse.json({ ok: true });
    }

    // Log per debug
    console.log("📨 Messaggio ricevuto:", {
      chatId,
      text,
      user: user ? `${user.first_name} (@${user.username})` : "unknown"
    });

    // Se non c'è testo, ignora il messaggio
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Gestisci i comandi
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();
      
      switch (command) {
        case '/start':
          await handleStartCommand(chatId, user);
          break;
        
        case '/help':
          await handleHelpCommand(chatId);
          break;
        
        case '/register':
          await handleRegisterCommand(message);
          break;
        
        default:
          await handleUnknownCommand(chatId, command);
          break;
      }
    } else {
      // Per messaggi di testo normali, rispondi con un messaggio generico
      const message = `💬 Ciao! Ho ricevuto il tuo messaggio.

🔗 **Per usare CalenSync:**
Apri la Mini App dal menu del bot per accedere a tutte le funzionalità.

❓ **Comandi disponibili:**
/start - Messaggio di benvenuto
/register - Registra questo gruppo per i promemoria
/help - Mostra l'aiuto`;

      await sendTelegramMessage(chatId.toString(), message);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("❌ Errore nel webhook Telegram:", error);
    
    // Rispondi sempre con successo a Telegram per evitare retry
    return NextResponse.json({ ok: true });
  }
}