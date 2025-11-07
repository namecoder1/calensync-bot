import type { NextRequest } from "next/server";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramParseMode = "Markdown" | "HTML" | "MarkdownV2";

export interface SendMessageOptions {
  parse_mode?: TelegramParseMode;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  message_thread_id?: number; // ID del topic per supergruppi
}

export async function sendTelegramMessage(chatId: string, text: string, opts?: SendMessageOptions) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN env var");

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: opts?.parse_mode ?? "HTML",
    disable_web_page_preview: opts?.disable_web_page_preview ?? true,
    disable_notification: opts?.disable_notification ?? false,
  };

  // Aggiungi message_thread_id se specificato (per i topic dei supergruppi)
  if (opts?.message_thread_id !== undefined) {
    body.message_thread_id = opts.message_thread_id;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return res.json();
}
