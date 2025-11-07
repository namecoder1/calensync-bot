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
    .from('user_telegram_groups')
    .select('group_chat_id, group_title, group_type, topic_id, topic_name, is_active')
    .eq('telegram_id', userId)
    .eq('is_active', true)
    .order('group_title');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Aggregate by group_chat_id
  const byChat = new Map<string, { chat_id: string; title: string | null; type: string | null; topics: Array<{ id: number; title: string }>; }>();
  for (const row of data || []) {
    const chatId = row.group_chat_id as string;
    if (!byChat.has(chatId)) {
      byChat.set(chatId, { chat_id: chatId, title: row.group_title || null, type: row.group_type || null, topics: [] });
    }
    const entry = byChat.get(chatId)!;
    if (row.topic_id != null) {
      entry.topics.push({ id: row.topic_id as number, title: row.topic_name || `Topic ${row.topic_id}` });
    }
    if (!entry.title && row.group_title) entry.title = row.group_title;
    if (!entry.type && row.group_type) entry.type = row.group_type;
  }

  const groups = Array.from(byChat.values()).map(g => ({
    chat_id: g.chat_id,
    title: g.title || 'Group',
    type: (g.type || 'group') as 'private' | 'group' | 'supergroup' | 'channel',
    topics: g.topics,
  }));

  return NextResponse.json({ ok: true, groups });
}
