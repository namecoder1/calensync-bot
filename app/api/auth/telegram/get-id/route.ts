import { NextRequest, NextResponse } from "next/server";

function parseInitData(initData: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const pairs = initData.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=', 2);
    if (key && value !== undefined) {
      obj[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const initData = body?.initData;
    
    if (!initData) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing initData" 
      }, { status: 400 });
    }

    // Parse the initData
    const parsed = parseInitData(initData);
    
    // Try to parse user
    let user: any = undefined;
    try {
      if (parsed["user"]) {
        user = JSON.parse(parsed["user"]);
      }
    } catch (e: any) {
      return NextResponse.json({
        ok: false,
        error: "Failed to parse user data from Telegram"
      }, { status: 400 });
    }

    if (!user || !user.id) {
      return NextResponse.json({
        ok: false,
        error: "No user ID found in Telegram data"
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `Il tuo Telegram ID è: ${user.id}`,
      userInfo: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code
      },
      instructions: "Copia questo ID e invialo all'amministratore per richiedere l'accesso all'app."
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: `Errore del server: ${e.message}`
    }, { status: 500 });
  }
}
