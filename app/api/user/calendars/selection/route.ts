import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { createTelegramAuthMiddleware } from "@/lib/telegram-auth";
import { updateDailyAnalytics } from "@/lib/analytics";

interface CalendarSelectionItem {
  calendarId: string;
  calendarName: string;
  calendarDescription?: string | null;
}

async function handler(req: NextRequest, userId: string, body?: any) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const supabase = await createClient();

  console.log('Body ricevuto dal middleware:', body);
  const items = (body?.items || []) as CalendarSelectionItem[];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: 'items array required' }, { status: 400 });
  }

  // Normalize input
  const toEnableIds = new Set(items.map(i => i.calendarId));

  // Disable calendars not present in new selection
  try {
    await supabase
      .from('user_calendars')
      .update({ is_enabled: false })
      .eq('telegram_id', userId)
      .not('calendar_id', 'in', `(${[...toEnableIds].map(id => `'${id.replace(/'/g, "''")}'`).join(',') || "''"})`);
  } catch (e) {
    // non-fatal; proceed with upserts
  }

  // Upsert selected calendars as enabled
  const upsertPayload = items.map((i) => ({
    telegram_id: userId,
    calendar_id: i.calendarId,
    calendar_name: i.calendarName,
    calendar_description: i.calendarDescription ?? null,
    is_enabled: true,
  }));

  const { error: upsertError } = await supabase
    .from('user_calendars')
    .upsert(upsertPayload, { onConflict: 'telegram_id,calendar_id' });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  // Facoltativo: se almeno un calendario è abilitato, possiamo segnare google_connected=true in users
  await supabase
    .from('users')
    .update({ google_connected: true, google_connected_at: new Date().toISOString() })
    .eq('telegram_id', userId);

  return NextResponse.json({ ok: true });
}

export const POST = createTelegramAuthMiddleware(async (req, userId, body) => {
  const res = await handler(req, userId, body);
  // Aggiorna analytics: conteggio calendari abilitati
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_calendars')
      .select('id')
      .eq('telegram_id', userId)
      .eq('is_enabled', true);
    if (!error) {
      await updateDailyAnalytics(userId, { calendars_synced: data?.length || 0, settings_changed: 1 });
    }
  } catch {}
  return res;
});
