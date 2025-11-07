import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

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

🔗 **Per iniziare, apri la Mini App:**
Tocca il pulsante qui sotto o vai al menu del bot.

📅 **Cosa puoi fare:**
• Connetti il tuo Google Calendar
• Ricevi promemoria automatici su Telegram
• Gestisci i tuoi eventi in modo semplice

❓ **Hai bisogno di aiuto?**
Usa il comando /help per vedere tutti i comandi disponibili.`;

  await sendTelegramMessage(chatId.toString(), message);
}

// Funzione per gestire il comando /help
async function handleHelpCommand(chatId: number): Promise<void> {
  const message = `❓ **Comandi disponibili:**

/start - Avvia il bot e mostra il messaggio di benvenuto
/help - Mostra questo menu di aiuto

🔗 **Mini App:**
Per usare tutte le funzionalità, apri la Mini App di CalenSync dal menu del bot.

📅 **Funzionalità principali:**
• Connessione con Google Calendar
• Promemoria automatici per eventi
• Gestione eventi e attività
• Sincronizzazione in tempo reale

🛠️ **Supporto:**
Se hai problemi, contatta l'amministratore del bot.`;

  await sendTelegramMessage(chatId.toString(), message);
}

// Funzione per gestire comandi sconosciuti
async function handleUnknownCommand(chatId: number, command: string): Promise<void> {
  const message = `❌ Comando sconosciuto: ${command}

📋 **Comandi disponibili:**
/start - Avvia il bot
/help - Mostra l'aiuto

💡 **Suggerimento:**
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