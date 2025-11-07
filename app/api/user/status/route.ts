import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";
import { hasUserGoogleTokens } from "@/lib/google-tokens";
import { createClient } from "@/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const ok = await isAuthorizedTelegramUser(userId);
  if (!ok) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const supabase = await createClient();

  // Ensure user row exists; we upsert minimal info for now
  await supabase.from('users').upsert({
    telegram_id: userId,
    last_active_at: new Date().toISOString(),
  }, { onConflict: 'telegram_id' });

  // Read back the user
  const { data: users, error } = await supabase
    .from('users')
    .select('telegram_id, onboarding_completed, google_connected')
    .eq('telegram_id', userId)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = users?.[0] || null;
  const hasTokens = await hasUserGoogleTokens(userId);

  return NextResponse.json({
    ok: true,
    userId,
    onboarding_completed: row?.onboarding_completed ?? false,
    google_connected: row?.google_connected ?? hasTokens,
    hasTokens,
  });
}
