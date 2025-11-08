import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { updateDailyAnalytics } from "@/lib/analytics";
import { createTelegramAuthMiddleware } from "@/lib/telegram-auth";

interface TopicItem { id: number; title?: string }
interface RegisterItem {
  chatId: string;
  title?: string;
  type?: 'private' | 'group' | 'supergroup' | 'channel';
  topics?: TopicItem[];
}

async function handler(req: NextRequest, userId: string) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }
  const supabase = await createClient();

  let body: any = null;
  try { body = await req.json(); } catch (e) {
    console.error('Failed to parse request body:', e);
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  let items: RegisterItem[] = [];
  const replace: boolean = Boolean(body?.replace);
  
  console.log('Received body:', JSON.stringify(body, null, 2));
  
  if (Array.isArray(body?.items)) items = body.items;
  else if (body?.chatId) items = [body as RegisterItem];

  console.log('Parsed items:', JSON.stringify(items, null, 2));

  if (!items.length) return NextResponse.json({ ok: false, error: 'No items to register' }, { status: 400 });

  // Upsert group rows, plus topics
  const selectedKeys = new Set<string>(); // key format: `${chatId}#${topicId ?? ''}`
  for (const it of items) {
    const base = {
      telegram_id: userId,
      group_chat_id: it.chatId,
      group_title: it.title ?? null,
      group_type: it.type ?? 'group',
      is_active: true,
    } as const;

    // Upsert the base group row (topic_id null)
    const { error: upsertGroupErr } = await supabase
      .from('user_telegram_groups')
      .upsert({ ...base, topic_id: null, topic_name: null }, { onConflict: 'telegram_id,group_chat_id,topic_id' });
    if (upsertGroupErr) return NextResponse.json({ ok: false, error: upsertGroupErr.message }, { status: 500 });
    selectedKeys.add(`${it.chatId}#`);

    // Upsert each topic if provided
    if (Array.isArray(it.topics)) {
      for (const t of it.topics) {
        const { error: upsertTopicErr } = await supabase
          .from('user_telegram_groups')
          .upsert({ ...base, topic_id: t.id, topic_name: t.title ?? null }, { onConflict: 'telegram_id,group_chat_id,topic_id' });
        if (upsertTopicErr) return NextResponse.json({ ok: false, error: upsertTopicErr.message }, { status: 500 });
        selectedKeys.add(`${it.chatId}#${t.id}`);
      }
    }
  }

  // Se replace=true, disattiva tutte le altre righe dell'utente non presenti tra i selectedKeys
  if (replace) {
    const { data: allRows, error: listErr } = await supabase
      .from('user_telegram_groups')
      .select('id, group_chat_id, topic_id, is_active')
      .eq('telegram_id', userId);
    if (listErr) return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    for (const r of allRows || []) {
      const key = `${r.group_chat_id}#${r.topic_id ?? ''}`;
      if (!selectedKeys.has(key) && r.is_active === true) {
        const { error: updErr } = await supabase
          .from('user_telegram_groups')
          .update({ is_active: false })
          .eq('id', r.id);
        if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
    }
  }

  // Aggiorna analytics: groups_active = numero gruppi attivi
  try {
    const { data: activeRows, error: activeErr } = await supabase
      .from('user_telegram_groups')
      .select('id')
      .eq('telegram_id', userId)
      .eq('is_active', true);
    if (!activeErr) {
      await updateDailyAnalytics(userId, { groups_active: activeRows?.length || 0, settings_changed: 1 });
    }
  } catch {}
  return NextResponse.json({ ok: true });
}

export const POST = createTelegramAuthMiddleware(handler);
