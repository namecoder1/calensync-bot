import { google } from "googleapis";
import { addMinutes, isAfter, isBefore } from "date-fns";
import type { EventType } from "@/types";
import { getEventStartDate } from "@/lib/utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { logReminder } from "@/lib/analytics";
import { getGoogleTokens, getUserGoogleTokens } from "@/lib/google-tokens";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";
import { redis } from "@/lib/redis";
import { createClient } from "@/supabase/server";

interface Destination { chatId: string; topicId?: number | null }
interface DueReminder { key: string; event: EventType; minutes: number; when: Date; destination: Destination }

function parseHtmlDescription(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/>/gi, "\n")
    .replace(/<br\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '<a href="$1">$2</a>')
    .replace(/<strong>/gi, "<b>")
    .replace(/<\/strong>/gi, "</b>")
    .replace(/<em>/gi, "<i>")
    .replace(/<\/em>/gi, "</i>")
    .replace(/<(?!\/?(b|i|a|code|pre|u|s|strike)\b)[^>]*>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function reminderKey(evId: string, minutes: number, when: Date, dest: Destination): string { const bucket = Math.floor(when.getTime()/60000); return `${evId}|${minutes}|${bucket}|${dest.chatId}|${dest.topicId ?? 'no-topic'}`; }

async function fetchUpcomingEvents(userId?: string): Promise<EventType[]> {
  let tokens: any = null;
  if (userId) { const ok = await isAuthorizedTelegramUser(userId); if (!ok) throw new Error("Utente Telegram non autorizzato"); tokens = await getUserGoogleTokens(userId); }
  else { tokens = await getGoogleTokens(); }
  if (!tokens) throw new Error("Token Google mancanti: connetti Google prima");
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  let targetIds: string[] = [];
  if (userId) {
    const supabase = await createClient();
    const { data: rows, error } = await supabase.from('user_calendars').select('calendar_id').eq('telegram_id', userId).eq('is_enabled', true);
    if (error) throw new Error(error.message);
    targetIds = (rows || []).map((r: any) => r.calendar_id).filter(Boolean);
    if (targetIds.length === 0) throw new Error("Nessun calendario selezionato per l'utente");
  } else {
    const envIds = (process.env.GOOGLE_CALENDAR_IDS || "").trim();
    const singleId = (process.env.GOOGLE_CALENDAR_ID || "").trim();
    const parseCsv = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean);
    if (envIds) targetIds = parseCsv(envIds); else if (singleId) targetIds = [singleId]; else throw new Error("Nessun calendario configurato (env)");
  }

  const nowIso = new Date().toISOString();
  const perCalMax = 50;
  const calendarList = await calendar.calendarList.list({ maxResults: 250 }).catch(() => ({ data: { items: [] as any[] } }));
  const calMeta = new Map<string, { summary?: string; defaultReminders?: Array<{ method?: string|null; minutes?: number|null }> }>();
  for (const entry of calendarList.data.items || []) { if (entry.id) calMeta.set(entry.id, { summary: entry.summary || undefined, defaultReminders: entry.defaultReminders || [] }); }

  const all: EventType[] = [] as any;
  for (const calId of targetIds) {
    const [eventsRes, defaults] = await Promise.all([
      calendar.events.list({ calendarId: calId, timeMin: nowIso, maxResults: perCalMax, singleEvents: true, orderBy: "startTime", fields: "items(id,summary,description,location,hangoutLink,attendees(email,self,responseStatus,organizer),start,end,updated,created,etag,htmlLink,iCalUID,kind,status,organizer(email,self),creator(email,self),eventType,guestsCanInviteOthers,reminders(useDefault,overrides(method,minutes))),nextPageToken" }),
      (async () => calMeta.get(calId)?.defaultReminders ?? (await calendar.calendarList.get({ calendarId: calId })).data.defaultReminders ?? [])(),
    ]);
    const rawItems = (eventsRes.data.items ?? []).filter((ev: any) => ev?.eventType !== 'birthday');
    const defaultReminders = defaults ?? [];
    const calendarSummary = calMeta.get(calId)?.summary;
    for (const ev of rawItems) {
      const overrides = ev?.reminders?.overrides; const useDefault = ev?.reminders?.useDefault;
      const rawEffective = Array.isArray(overrides) && overrides.length>0 ? overrides : useDefault ? defaultReminders : [];
      const effective = (rawEffective||[]).map((r: any)=>({ method: (r?.method??null) as 'email'|'popup'|null, minutes: (r?.minutes??null) as number|null }));
      const defaultMapped = (defaultReminders||[]).map((r: any)=>({ method: (r?.method??null) as 'email'|'popup'|null, minutes: (r?.minutes??null) as number|null }));
      const withMeta: any = { ...ev, effectiveReminders: effective, calendarDefaultReminders: defaultMapped, sourceCalendarId: calId, sourceCalendarSummary: calendarSummary };
      all.push(withMeta);
    }
  }
  all.sort((a:any,b:any)=> (getEventStartDate(a)?.getTime()??0) - (getEventStartDate(b)?.getTime()??0));
  return all;
}

function buildMessage(ev: EventType, when: Date, minutes: number): string {
  const start = getEventStartDate(ev); const title = ev.summary || "(Senza titolo)"; const startStr = start ? start.toLocaleString("it-IT") : "";
  const eventLink = (ev as any).htmlLink || ""; const meetLink = (ev as any).hangoutLink || ""; const desc = parseHtmlDescription((ev as any).description)?.slice(0,800);
  const minutesStr = minutes===0?"Ora": minutes<60? `${minutes} min prima` : `${Math.floor(minutes/60)}h ${minutes%60? (minutes%60)+'m':''} prima`;
  let msg = `<b>Promemoria</b> (${minutesStr})\n<b>${escapeHtml(title)}</b>\n`; if (startStr) msg += `🗓️ ${startStr}\n`; if (desc) msg += `\n${desc}\n`; if (meetLink) msg += `\n📹 <a href="${meetLink}">Partecipa a Meet</a>`; if (eventLink) msg += `\n🔗 <a href="${eventLink}">Apri evento</a>`; return msg;
}

export async function dispatchDueReminders(now = new Date(), options?: { mode?: 'auto' | 'manual'; userId?: string }) {
  const mode = options?.mode || 'auto'; const userId = options?.userId;
  let from: Date; let to: Date;
  if (mode==='manual') { const startOfDay=new Date(now); startOfDay.setHours(0,0,0,0); from=startOfDay; const endOfDay=new Date(now); endOfDay.setHours(23,59,59,999); to=endOfDay; }
  else { const hour=now.getHours(); if (hour>=6 && hour<8) { const startOfDay=new Date(now); startOfDay.setHours(0,0,0,0); from=startOfDay; to=new Date(now); to.setHours(13,0,0,0);} else { from=new Date(now.getTime()-60*60*1000); to=new Date(now.getTime()+10*60*1000);} }

  const events = await fetchUpcomingEvents(userId);
  const calendarDestinations: Map<string, Destination[]> = new Map();
  if (userId) {
    try { const supabase = await createClient(); const { data: maps, error } = await supabase.from('v_user_active_mappings').select('calendar_id, group_chat_id, topic_id').eq('telegram_id', userId); if (error) throw error; for (const m of maps||[]) { if (!m.calendar_id || !m.group_chat_id) continue; const arr = calendarDestinations.get(m.calendar_id) || []; arr.push({ chatId: m.group_chat_id, topicId: m.topic_id }); calendarDestinations.set(m.calendar_id, arr); } }
    catch(e){ console.warn('Errore mappature utente', e); }
  }

  const due: DueReminder[] = [];
  for (const ev of events) {
    const start = getEventStartDate(ev); if (!start) continue; const reminders = (ev as any).effectiveReminders || [];
    for (const r of reminders) {
      const minutes = r.minutes ?? null; if (minutes==null || isNaN(minutes)) continue; const when = addMinutes(start, -minutes); if (isBefore(when, from) || isAfter(when, to)) continue;
      const calId = (ev as any).sourceCalendarId as string | undefined; let destinations: Destination[] = [];
      if (userId) { if (calId && calendarDestinations.has(calId)) destinations = calendarDestinations.get(calId)!; else continue; }
      else { const legacyGroupId = process.env.TELEGRAM_GROUP_ID || ""; const legacyTopicRdB = parseInt(process.env.TELEGRAM_TOPIC_RDB || "2",10); const legacyTopicRdC = parseInt(process.env.TELEGRAM_TOPIC_RDC || "3",10); if (legacyGroupId){ const title=(ev.summary||'').toLowerCase(); if (title.includes('[rdb]')) destinations.push({ chatId: legacyGroupId, topicId: legacyTopicRdB }); else if (title.includes('[rdc]')) destinations.push({ chatId: legacyGroupId, topicId: legacyTopicRdC }); else destinations.push({ chatId: legacyGroupId, topicId: null }); } else continue; }
      for (const dest of destinations) { due.push({ key: reminderKey(ev.id, minutes, when, dest), event: ev, minutes, when, destination: dest }); }
    }
  }

  const ttlSec = 7*24*3600; let sent=0; let skipped=0; const errors: Array<{key:string; error:string}> = [];
  for (const item of due) {
    const redisKey = `reminder:sent:${item.key}`; const locked = await redis.set(redisKey,'lock',{ nx:true, ex: ttlSec }); if (!locked){ skipped++; continue; }
    const msg = buildMessage(item.event, item.when, item.minutes);
    try {
      const dest = item.destination; if (!dest.chatId){ skipped++; await redis.del(redisKey); continue; }
      const opts = dest.topicId!=null ? { message_thread_id: dest.topicId } : undefined;
      let messageId: number | null = null;
      try {
        const tgRes = await sendTelegramMessage(dest.chatId, msg, opts);
        messageId = tgRes?.result?.message_id ?? tgRes?.message_id ?? null;
        await redis.set(redisKey,'1',{ ex: ttlSec }); sent++;
        if (userId) {
          await logReminder({
            telegramId: userId,
            event: item.event,
            calendarId: (item.event as any).sourceCalendarId,
            minutes: item.minutes,
            dueAt: item.when,
            chatId: dest.chatId,
            topicId: dest.topicId ?? null,
            messageId: messageId,
            status: 'sent'
          });
        }
      } catch (inner) {
        await redis.del(redisKey);
        errors.push({ key: item.key, error: (inner as any)?.message || String(inner) });
        if (userId) {
          await logReminder({
            telegramId: userId,
            event: item.event,
            calendarId: (item.event as any).sourceCalendarId,
            minutes: item.minutes,
            dueAt: item.when,
            chatId: dest.chatId,
            topicId: dest.topicId ?? null,
            status: 'failed',
            errorMessage: (inner as any)?.message || String(inner)
          });
        }
      }
    }
    catch(e:any){ await redis.del(redisKey); errors.push({ key: item.key, error: e?.message || String(e) }); }
  }
  return { sent, skipped, totalDue: due.length, errors };
}
