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
        error: "Missing initData",
        received: body 
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
        error: "Failed to parse user JSON",
        parseError: e.message,
        rawUser: parsed["user"]
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      debug: {
        initDataLength: initData.length,
        parsedKeys: Object.keys(parsed),
        hasHash: !!parsed["hash"],
        hasUser: !!parsed["user"],
        hasAuthDate: !!parsed["auth_date"],
        authDate: parsed["auth_date"],
        authDateAge: parsed["auth_date"] ? Math.floor(Date.now() / 1000) - Number(parsed["auth_date"]) : null,
        user: user,
        allParsedData: parsed
      }
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      stack: e.stack
    }, { status: 500 });
  }
}
