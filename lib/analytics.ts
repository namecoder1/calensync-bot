import { createClient } from "@/supabase/server";
import { getEventStartDate } from "@/lib/utils";

type LogStatus = 'sent' | 'failed' | 'skipped';

interface LogReminderParams {
  telegramId: string; // obbligatorio per schema
  event: any;
  calendarId: string;
  minutes: number;
  dueAt: Date;
  chatId: string;
  topicId?: number | null;
  messageId?: number | null;
  status: LogStatus;
  errorMessage?: string | null;
}

/**
 * Inserisce una riga in reminder_logs per analytics e storicizzazione.
 * Richiede telegramId (schema NOT NULL). In caso di errore non blocca il flusso.
 */
export async function logReminder(p: LogReminderParams) {
  try {
    const supabase = await createClient();
    const title = (p.event?.summary as string) || null;
    const start = getEventStartDate(p.event) || null;
    const messageId = p.messageId ?? null;
    const topicId = p.topicId ?? null;
    const errorMessage = p.errorMessage ?? null;

    await supabase.from('reminder_logs').insert({
      telegram_id: p.telegramId,
      event_id: p.event?.id,
      calendar_id: p.calendarId,
      event_title: title,
      event_start_time: start,
      reminder_minutes: p.minutes,
      reminder_due_at: p.dueAt.toISOString(),
      group_chat_id: p.chatId,
      topic_id: topicId,
      message_id: messageId,
      status: p.status,
      error_message: errorMessage,
    });
  } catch (e) {
    // Non interrompere il flusso principale per errori di logging
    console.warn('[analytics] reminder_logs insert failed:', (e as any)?.message || e);
  }
}

type DailyPartial = Partial<{
  reminders_sent: number;
  reminders_failed: number;
  calendars_synced: number; // valore assoluto (set)
  groups_active: number; // valore assoluto (set)
  manual_dispatches: number;
  app_opens: number;
  settings_changed: number;
}>;

/**
 * Aggiorna i contatori giornalieri in user_analytics.
 * I campi *_synced e groups_active vengono "settati" (override), gli altri vengono incrementati.
 */
export async function updateDailyAnalytics(telegramId: string, partial: DailyPartial) {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('date', today)
      .limit(1);
    if (error) throw error;
    const existing = data?.[0];
    if (!existing) {
      // Insert new row
      await supabase.from('user_analytics').insert({
        telegram_id: telegramId,
        date: today,
        reminders_sent: partial.reminders_sent || 0,
        reminders_failed: partial.reminders_failed || 0,
        calendars_synced: partial.calendars_synced || 0,
        groups_active: partial.groups_active || 0,
        manual_dispatches: partial.manual_dispatches || 0,
        app_opens: partial.app_opens || 0,
        settings_changed: partial.settings_changed || 0,
      });
      return;
    }
    const updates: any = {};
    const setFields = ['calendars_synced','groups_active'] as const;
    for (const [k,v] of Object.entries(partial)) {
      if (v == null) continue;
      if ((setFields as readonly string[]).includes(k)) {
        updates[k] = v; // override
      } else {
        const current = existing[k] ?? 0;
        updates[k] = current + v;
      }
    }
    if (Object.keys(updates).length === 0) return;
    updates.updated_at = new Date().toISOString();
    await supabase
      .from('user_analytics')
      .update(updates)
      .eq('telegram_id', telegramId)
      .eq('date', today);
  } catch (e) {
    console.warn('[analytics] updateDailyAnalytics failed:', (e as any)?.message || e);
  }
}
