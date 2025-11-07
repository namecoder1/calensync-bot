import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { updateDailyAnalytics } from "@/lib/analytics";
import { createTelegramAuthMiddleware } from "@/lib/telegram-auth";

async function handler(req: NextRequest, userId: string) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const supabase = await createClient();

  // Controlla che ci sia almeno 1 calendario e 1 mapping attivo
  const [{ data: calCountData, error: calErr }, { data: mapCountData, error: mapErr }] = await Promise.all([
    supabase.from('user_calendars').select('id', { count: 'exact' }).eq('telegram_id', userId).eq('is_enabled', true),
    supabase.from('calendar_group_mappings').select('id', { count: 'exact' }).eq('telegram_id', userId).eq('is_active', true),
  ]);
  if (calErr) return NextResponse.json({ ok: false, error: calErr.message }, { status: 500 });
  if (mapErr) return NextResponse.json({ ok: false, error: mapErr.message }, { status: 500 });

  const calCount = calCountData?.length ?? 0; // Supabase returns data array; count in headers not accessible here
  const mapCount = mapCountData?.length ?? 0;

  if (calCount === 0) return NextResponse.json({ ok: false, error: 'Nessun calendario selezionato' }, { status: 400 });
  if (mapCount === 0) return NextResponse.json({ ok: false, error: 'Nessuna mappatura attiva' }, { status: 400 });

  const { error: updErr } = await supabase
    .from('users')
    .update({ onboarding_completed: true, last_active_at: new Date().toISOString() })
    .eq('telegram_id', userId);
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  try { await updateDailyAnalytics(userId, { settings_changed: 1 }); } catch {}
  return NextResponse.json({ ok: true });
}

export const POST = createTelegramAuthMiddleware(handler);
