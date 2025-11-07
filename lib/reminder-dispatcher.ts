import { google } from "googleapis";
import { addMinutes, isAfter, isBefore } from "date-fns";
import type { EventType } from "@/types";
import { getEventStartDate } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { getGoogleTokens } from "@/lib/google-tokens";
import { redis } from "@/lib/redis";

type Topic = "general" | "rdb" | "rdc";

interface DueReminder {
  key: string; // unique key for dedupe
  event: EventType;
  minutes: number;
  when: Date;
  topic: Topic | null;
}

// Deduplica via Redis: useremo chiavi con TTL (7 giorni)

function parseHtmlDescription(html?: string | null): string {
  if (!html) return "";
  
  // Converti alcuni tag HTML comuni in formato Telegram HTML
  let parsed = html
    // Converti <br> e <br/> in newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Converti <p> in newline doppio
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    // Mantieni i link convertendoli in formato Telegram
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '<a href="$1">$2</a>')
    // Converti <strong> e <b> in <b>
    .replace(/<strong>/gi, "<b>")
    .replace(/<\/strong>/gi, "</b>")
    // Converti <em> e <i> in <i>
    .replace(/<em>/gi, "<i>")
    .replace(/<\/em>/gi, "</i>")
    // Rimuovi altri tag HTML non supportati da Telegram
    .replace(/<(?!\/?(b|i|a|code|pre|u|s|strike)\b)[^>]*>/gi, "")
    // Pulisci spazi multipli e newline eccessivi
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  return parsed;
}

function classifyTopic(ev: EventType): Topic | null {
  const title = (ev.summary || "").toLowerCase();
  if (title.includes("[all]") || title.includes("[generale]")) return "general";
  if (title.includes("[rdb]")) return "rdb";
  if (title.includes("[rdc]")) return "rdc";

  // Fallback via mapping per nome calendario
  const cal = (ev.sourceCalendarSummary || "").trim();
  
  // Mappa i calendari ai topic
  // Calendario "Generale" → topic General
  // Calendario "RdB" → topic RdB
  // Calendario "RdC" → topic RdC
  if (cal === "Generale") return "general";
  if (cal === "RdB") return "rdb";
  if (cal === "RdC") return "rdc";

  // Fallback al default (se configurato)
  const def = (process.env.REMINDER_DEFAULT_GROUP || "").toLowerCase();
  if (def === "rdb") return "rdb";
  if (def === "rdc") return "rdc";
  if (def === "general") return "general";
  return null;
}

function reminderKey(evId: string, minutes: number, when: Date): string {
  // Minute-level idempotency
  const bucket = Math.floor(when.getTime() / 60000);
  return `${evId}|${minutes}|${bucket}`;
}

async function fetchUpcomingEvents(): Promise<EventType[]> {
  const tokens = await getGoogleTokens();
  if (!tokens) throw new Error("Token Google mancanti: autenticati prima con 'Connetti Google'");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const envIds = (process.env.GOOGLE_CALENDAR_IDS || "").trim();
  const envNames = (process.env.GOOGLE_CALENDAR_NAMES || "").trim();
  const singleId = (process.env.GOOGLE_CALENDAR_ID || "").trim();
  const parseCsv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  let targetIds: string[] | null = null;
  let targetNames: string[] | null = null;

  if (envIds) targetIds = parseCsv(envIds);
  if (!targetIds && envNames) targetNames = parseCsv(envNames);

  // Resolve names to ids if needed
  if (!targetIds && targetNames) {
    const list = await calendar.calendarList.list({ maxResults: 250 });
    const entries = list.data.items || [];
    const nameToId = new Map<string, string>();
    for (const entry of entries) {
      const summary = (entry.summary || "").trim();
      if (summary && entry.id) nameToId.set(summary.toLowerCase(), entry.id);
    }
    targetIds = targetNames
      .map((n) => nameToId.get(n.toLowerCase()))
      .filter((id): id is string => Boolean(id));
  }

  if ((!targetIds || targetIds.length === 0) && singleId) targetIds = [singleId];
  if (!targetIds || targetIds.length === 0) throw new Error("Nessun calendario configurato per il fetch eventi");

  const nowIso = new Date().toISOString();
  const perCalMax = 50; // un po' più ampio per coprire promemoria

  // Build a map of calendar metadata
  const calendarList = await calendar.calendarList.list({ maxResults: 250 }).catch(() => ({ data: { items: [] as any[] } }));
  const calMeta = new Map<string, { summary?: string; defaultReminders?: Array<{ method?: string | null; minutes?: number | null }> }>();
  for (const entry of calendarList.data.items || []) {
    if (entry.id) {
      calMeta.set(entry.id, {
        summary: entry.summary || undefined,
        defaultReminders: entry.defaultReminders || [],
      });
    }
  }

  const all: EventType[] = [] as any;

  for (const calId of targetIds) {
    const [eventsRes, defaults] = await Promise.all([
      calendar.events.list({
        calendarId: calId,
        timeMin: nowIso,
        maxResults: perCalMax,
        singleEvents: true,
        orderBy: "startTime",
        fields:
          "items(id,summary,description,location,hangoutLink,attendees(email,self,responseStatus,organizer),start,end,updated,created,etag,htmlLink,iCalUID,kind,status,organizer(email,self),creator(email,self),eventType,guestsCanInviteOthers,reminders(useDefault,overrides(method,minutes))),nextPageToken",
      }),
      (async () => calMeta.get(calId)?.defaultReminders ?? (await calendar.calendarList.get({ calendarId: calId })).data.defaultReminders ?? [])(),
    ]);

    const rawItems = (eventsRes.data.items ?? []).filter((ev: any) => ev?.eventType !== "birthday");
    const defaultReminders = defaults ?? [];
    const calendarSummary = calMeta.get(calId)?.summary;
    for (const ev of rawItems) {
      const overrides = ev?.reminders?.overrides;
      const useDefault = ev?.reminders?.useDefault;
      const rawEffective = Array.isArray(overrides) && overrides.length > 0 ? overrides : useDefault ? defaultReminders : [];
      const effective = (rawEffective || []).map((r: any) => ({
        method: (r?.method ?? null) as 'email' | 'popup' | null,
        minutes: (r?.minutes ?? null) as number | null,
      }));
      const defaultMapped = (defaultReminders || []).map((r: any) => ({
        method: (r?.method ?? null) as 'email' | 'popup' | null,
        minutes: (r?.minutes ?? null) as number | null,
      }));
      const withMeta: any = {
        ...ev,
        effectiveReminders: effective,
        calendarDefaultReminders: defaultMapped,
        sourceCalendarId: calId,
        sourceCalendarSummary: calendarSummary,
      };
      all.push(withMeta);
    }
  }

  // Sort by start
  all.sort((a, b) => {
    const sa = getEventStartDate(a)?.getTime() ?? 0;
    const sb = getEventStartDate(b)?.getTime() ?? 0;
    return sa - sb;
  });

  return all;
}

function buildMessage(ev: EventType, when: Date, minutes: number): string {
  const start = getEventStartDate(ev);
  const title = ev.summary || "(Senza titolo)";
  const startStr = start ? start.toLocaleString("it-IT") : "";
  const eventLink = ev.htmlLink || "";
  const meetLink = ev.hangoutLink || "";
  const desc = parseHtmlDescription(ev.description)?.slice(0, 800);
  const minutesStr = minutes === 0 ? "Ora" : minutes < 60 ? `${minutes} min prima` : `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + 'm' : ''} prima`;

  let msg = `<b>Promemoria</b> (${minutesStr})\n`;
  msg += `<b>${escapeHtml(title)}</b>\n`;
  if (startStr) msg += `🗓️ ${startStr}\n`;
  
  // Aggiungi descrizione parsata con HTML
  if (desc) msg += `\n${desc}\n`;
  
  // Aggiungi link Meet se presente
  if (meetLink) msg += `\n📹 <a href="${meetLink}">Partecipa a Meet</a>`;
  
  // Aggiungi link evento
  if (eventLink) msg += `\n🔗 <a href="${eventLink}">Apri evento</a>`;
  
  return msg;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function dispatchDueReminders(now = new Date(), options?: { mode?: 'auto' | 'manual' }) {
  const mode = options?.mode || 'auto';
  
  let from: Date;
  let to: Date;
  
  if (mode === 'manual') {
    // Modalità MANUALE (utente clicca il pulsante):
    // Invia TUTTI i promemoria di OGGI (passati E futuri)
    // Finestra: da mezzanotte di oggi fino a FINE GIORNATA
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    from = startOfDay;
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    to = endOfDay;
    
    console.log(`[MANUAL MODE] Checking ALL today's reminders from ${startOfDay.toLocaleString('it-IT')} to ${endOfDay.toLocaleString('it-IT')}`);
  } else {
    // Modalità AUTO (apertura app + cron giornaliero):
    // LOGICA INTELLIGENTE basata sull'ora corrente
    
    const hour = now.getHours();
    
    // Se è il cron mattutino (06:00-08:00) → Copri tutta la mattina
    if (hour >= 6 && hour < 8) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      from = startOfDay;
      
      // Fino alle 13:00 (coprire la mattina)
      to = new Date(now);
      to.setHours(13, 0, 0, 0);
      
      console.log(`[AUTO MODE - MORNING CRON] Checking reminders from ${from.toLocaleString('it-IT')} to ${to.toLocaleString('it-IT')}`);
    } 
    // Altrimenti: finestra rolling degli ultimi 60 min + prossimi 10 min
    else {
      const windowMinutes = 60;
      const futureBufferMinutes = 10;
      
      from = new Date(now.getTime() - windowMinutes * 60 * 1000);
      to = new Date(now.getTime() + futureBufferMinutes * 60 * 1000);
      
      console.log(`[AUTO MODE - ROLLING WINDOW] Checking reminders from ${from.toLocaleString('it-IT')} to ${to.toLocaleString('it-IT')}`);
    }
  }

  const groupId = process.env.TELEGRAM_GROUP_ID || "";
  const topicRdB = parseInt(process.env.TELEGRAM_TOPIC_RDB || "2", 10);
  const topicRdC = parseInt(process.env.TELEGRAM_TOPIC_RDC || "3", 10);

  const events = await fetchUpcomingEvents();

  const due: DueReminder[] = [];
  for (const ev of events) {
    const start = getEventStartDate(ev);
    if (!start) continue;
    const reminders = ev.effectiveReminders || [];
    for (const r of reminders) {
      const minutes = r.minutes ?? null;
      if (minutes == null || isNaN(minutes)) continue;
      const when = addMinutes(start, -minutes);
      if (isBefore(when, from) || isAfter(when, to)) continue; // not in window
      const topic = classifyTopic(ev);
      due.push({ key: reminderKey(ev.id, minutes, when), event: ev, minutes, when, topic });
    }
  }

  // Dedupe and send (via Redis)
  const ttlSec = 7 * 24 * 3600;
  let sent = 0;
  let skipped = 0;
  const errors: Array<{ key: string; error: string }> = [];

  for (const item of due) {
    const redisKey = `reminder:sent:${item.key}`;
    // Prova a mettere un lock NX prima dell'invio per evitare race; se esiste già, skip.
    const locked = await redis.set(redisKey, "lock", { nx: true, ex: ttlSec });
    if (!locked) { skipped++; continue; }

    const msg = buildMessage(item.event, item.when, item.minutes);
    try {
      if (!groupId) {
        skipped++;
        await redis.del(redisKey);
        continue;
      }

      // Invia nel topic appropriato in base alla classificazione
      if (item.topic === "general") {
        // Per il topic General NON specifichiamo message_thread_id
        await sendTelegramMessage(groupId, msg);
      } else if (item.topic === "rdb") {
        await sendTelegramMessage(groupId, msg, { message_thread_id: topicRdB });
      } else if (item.topic === "rdc") {
        await sendTelegramMessage(groupId, msg, { message_thread_id: topicRdC });
      } else {
        // No topic resolution -> skip silently
        skipped++;
        // Rimuovi lock perché non abbiamo effettivamente inviato
        await redis.del(redisKey);
        continue;
      }
      // Segna come inviato con TTL (idempotenza per 7 giorni)
      await redis.set(redisKey, "1", { ex: ttlSec });
      sent++;
    } catch (e: any) {
      // In caso di errore ripristina il lock per consentire retry successivi
      await redis.del(redisKey);
      errors.push({ key: item.key, error: e?.message || String(e) });
    }
  }

  return { sent, skipped, totalDue: due.length, errors };
}
