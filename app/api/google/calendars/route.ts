import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";
import { getUserGoogleTokens } from "@/lib/google-tokens";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });

    const ok = await isAuthorizedTelegramUser(userId);
    if (!ok) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

    const tokens = await getUserGoogleTokens(userId);
    if (!tokens) return NextResponse.json({ ok: false, error: "Google not connected" }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const res = await calendar.calendarList.list({ maxResults: 250 });
    const items = res.data.items || [];
    const calendars = items.map((c) => ({
      id: c.id!,
      summary: c.summary || "",
      primary: Boolean((c as any).primary),
      accessRole: c.accessRole || undefined,
    }));
    return NextResponse.json({ ok: true, calendars });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Internal error" }, { status: 500 });
  }
}
