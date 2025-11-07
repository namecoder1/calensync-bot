import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { createTelegramAuthMiddleware } from "@/lib/telegram-auth";

interface DeregisterItem {
  chatId: string;
  topicId?: number | null;
}

async function handler(req: NextRequest, userId: string) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }
  let body: any = null;
  try { body = await req.json(); } catch {}
  const items: DeregisterItem[] = Array.isArray(body?.items)
    ? body.items
    : body?.chatId
      ? [{ chatId: body.chatId, topicId: body.topicId ?? null }]
      : [];
  if (!items.length) return NextResponse.json({ ok: false, error: 'No items to deregister' }, { status: 400 });

  const supabase = await createClient();

  for (const it of items) {
    if (!it.chatId) continue;
    const q = supabase.from('user_telegram_groups').update({ is_active: false }).eq('telegram_id', userId).eq('group_chat_id', it.chatId);
    if (it.topicId == null) q.is('topic_id', null); else q.eq('topic_id', it.topicId);
    const { error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = createTelegramAuthMiddleware(handler);
