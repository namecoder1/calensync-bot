import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { updateDailyAnalytics } from "@/lib/analytics";
import { createTelegramAuthMiddleware, isAuthorizedTelegramUser } from "@/lib/telegram-auth";

// GET: restituisce mappature correnti risolte in forma comoda per la UI
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });

  const ok = await isAuthorizedTelegramUser(userId);
  if (!ok) return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 403 });

  const supabase = await createClient();
  // Usa la view v_user_active_mappings se disponibile
  const { data, error } = await supabase
    .from('v_user_active_mappings')
    .select('telegram_id, mapping_id, calendar_id, calendar_name, group_chat_id, topic_id, topic_name, group_title')
    .eq('telegram_id', userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const mappings = (data || []).map((m: any) => ({
    calendarId: m.calendar_id as string,
    calendarName: m.calendar_name as string,
    chatId: m.group_chat_id as string,
    topicId: m.topic_id as number | null,
    topicName: (m.topic_name as string) || null,
    groupTitle: (m.group_title as string) || null,
    mappingId: m.mapping_id as string,
  }));
  return NextResponse.json({ ok: true, mappings });
}

interface MappingInput { calendarId: string; chatId: string; topicId?: number | null }

async function postHandler(req: NextRequest, userId: string, preParsedBody?: any) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const body = preParsedBody ?? {};
  const inputs = (body?.mappings || []) as MappingInput[];
  if (!Array.isArray(inputs)) return NextResponse.json({ ok: false, error: 'mappings array required' }, { status: 400 });

  const supabase = await createClient();

  // Sostituisci tutte le mappature esistenti dell'utente con le nuove
  const { error: delErr } = await supabase
    .from('calendar_group_mappings')
    .delete()
    .eq('telegram_id', userId);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  // Se vuoto, consideriamo ok (nessuna mappatura)
  if (inputs.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  // Risolvi id delle tabelle figlie e inserisci
  let inserted = 0;
  const skipped: string[] = [];
  
  for (const inp of inputs) {
    if (!inp.calendarId || !inp.chatId) continue;

    // Trova user_calendar_id
    const { data: calRows, error: calErr } = await supabase
      .from('user_calendars')
      .select('id')
      .eq('telegram_id', userId)
      .eq('calendar_id', inp.calendarId)
      .eq('is_enabled', true)
      .limit(1);
    if (calErr) return NextResponse.json({ ok: false, error: calErr.message }, { status: 500 });
    const userCalendarId = calRows?.[0]?.id;
    if (!userCalendarId) {
      // calendar non selezionato/enabled → salta
      skipped.push(`Calendario ${inp.calendarId} non trovato o non abilitato`);
      continue;
    }

    // Trova user_telegram_group_id (topicId può essere null)
    const { data: grpRows, error: grpErr } = await supabase
      .from('user_telegram_groups')
      .select('id')
      .eq('telegram_id', userId)
      .eq('group_chat_id', inp.chatId)
      .is('topic_id', inp.topicId == null ? null : undefined)
      .eq(inp.topicId == null ? 'group_chat_id' : 'topic_id', inp.topicId == null ? inp.chatId : inp.topicId as any)
      .limit(1);

    // Nota: Supabase non consente condizionale dinamico elegante; facciamo due query invece.
    let userTelegramGroupId: string | null = null;
    if (grpErr) return NextResponse.json({ ok: false, error: grpErr.message }, { status: 500 });
    if (grpRows && grpRows.length > 0) {
      userTelegramGroupId = grpRows[0].id;
    } else {
      // fallback: query separata
      if (inp.topicId == null) {
        const { data: g0, error: e0 } = await supabase
          .from('user_telegram_groups')
          .select('id')
          .eq('telegram_id', userId)
          .eq('group_chat_id', inp.chatId)
          .is('topic_id', null)
          .limit(1);
        if (e0) return NextResponse.json({ ok: false, error: e0.message }, { status: 500 });
        userTelegramGroupId = g0?.[0]?.id ?? null;
      } else {
        const { data: g1, error: e1 } = await supabase
          .from('user_telegram_groups')
          .select('id')
          .eq('telegram_id', userId)
          .eq('group_chat_id', inp.chatId)
          .eq('topic_id', inp.topicId)
          .limit(1);
        if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
        userTelegramGroupId = g1?.[0]?.id ?? null;
      }
    }

    if (!userTelegramGroupId) {
      // gruppo non registrato → salta
      skipped.push(`Gruppo ${inp.chatId}${inp.topicId ? `#${inp.topicId}` : ''} non trovato o non registrato`);
      continue;
    }

    const { error: insErr } = await supabase
      .from('calendar_group_mappings')
      .insert({
        telegram_id: userId,
        user_calendar_id: userCalendarId,
        user_telegram_group_id: userTelegramGroupId,
        is_active: true,
      });
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    inserted++;
  }

  // Aggiorna analytics: consideriamo settings_changed +1
  try { await updateDailyAnalytics(userId, { settings_changed: 1 }); } catch {}
  
  const response: any = { ok: true, inserted };
  if (skipped.length > 0) {
    response.skipped = skipped;
    response.warning = `${inserted} mappature salvate, ${skipped.length} saltate`;
  }
  
  return NextResponse.json(response);
}

export const POST = createTelegramAuthMiddleware(postHandler);
