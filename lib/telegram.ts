const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramParseMode = "Markdown" | "HTML" | "MarkdownV2";

export interface SendMessageOptions {
  parse_mode?: TelegramParseMode;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  message_thread_id?: number; // ID del topic per supergruppi
  reply_markup?: any; // inline keyboard, etc.
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

  if (opts?.message_thread_id !== undefined) body.message_thread_id = opts.message_thread_id;
  if (opts?.reply_markup !== undefined) body.reply_markup = opts.reply_markup;

  const maxAttempts = 3;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < maxAttempts) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        // Retry solo per 429 o 5xx
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Retryable Telegram error ${res.status}: ${txt}`);
        }
        throw new Error(`Telegram sendMessage failed: ${res.status} ${res.statusText} ${txt}`);
      }
      return res.json();
    } catch (e: any) {
      lastErr = e;
      attempt++;
      if (attempt >= maxAttempts) break;
      const backoffMs = 150 * Math.pow(2, attempt); // 150, 300, 600
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  throw lastErr || new Error('Unknown telegram send error');
}
