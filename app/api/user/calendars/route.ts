import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });

  const ok = await isAuthorizedTelegramUser(userId);
  if (!ok) return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_calendars')
    .select('id, calendar_id, calendar_name, calendar_description, is_enabled, created_at, updated_at')
    .eq('telegram_id', userId)
    .eq('is_enabled', true)
    .order('calendar_name');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, calendars: data || [] });
}
