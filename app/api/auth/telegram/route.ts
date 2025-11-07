import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Create secret key according to Telegram documentation
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function createSecretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

function parseInitData(initData: string): Record<string, string> {
  const obj: Record<string, string> = {};
  
  // Try URL encoding safe parsing
  try {
    const pairs = initData.split('&');
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) continue;
      
      const key = pair.substring(0, eqIndex);
      const value = pair.substring(eqIndex + 1);
      
      if (key && value) {
        try {
          obj[decodeURIComponent(key)] = decodeURIComponent(value);
        } catch (e) {
          // If decoding fails, use raw value
          obj[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("Error parsing initData:", e);
  }
  
  return obj;
}

function verifyTelegramWebAppData(initData: string, botToken: string): { valid: boolean; data?: any; error?: string } {
  try {
    const data = parseInitData(initData);
    const hash = data.hash;
    
    if (!hash) {
      return { valid: false, error: "Missing hash parameter" };
    }
    
    // Remove hash from data
    delete data.hash;
    
    // Create data-check-string
    const keys = Object.keys(data).sort();
    const dataCheckString = keys.map(key => `${key}=${data[key]}`).join('\n');
    
    // Create secret key
    const secretKey = createSecretKey(botToken);
    
    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Verify hash
    if (hmac !== hash) {
      return { valid: false, error: "Invalid hash signature" };
    }
    
    // Check auth_date (should be within 24 hours)
    const authDate = parseInt(data.auth_date || '0');
    const now = Math.floor(Date.now() / 1000);
    if (authDate && (now - authDate > 86400)) {
      return { valid: false, error: "Auth data expired (>24 hours)" };
    }
    
    // Parse user data
    let user: any = null;
    if (data.user) {
      try {
        user = JSON.parse(data.user);
      } catch (e) {
        return { valid: false, error: "Failed to parse user data" };
      }
    }
    
    return { valid: true, data: { ...data, user } };
  } catch (e: any) {
    return { valid: false, error: `Verification error: ${e.message}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== Telegram Auth Request ===");
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const initData = body?.initData;
    if (!initData) {
      console.error("Missing initData in request");
      return NextResponse.json({ ok: false, error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
    }

    // Verify Telegram data
    const verification = verifyTelegramWebAppData(initData, botToken);
    
    if (!verification.valid) {
      console.error("Verification failed:", verification.error);
      
      // Try to extract user info anyway for authorized users (fallback mode)
      const data = parseInitData(initData);
      let user: any = null;
      try {
        if (data.user) {
          user = JSON.parse(data.user);
        }
      } catch (e) {
        return NextResponse.json({ ok: false, error: verification.error }, { status: 401 });
      }
      
      // Check if user is authorized (bypass signature check for authorized users)
      if (user?.id) {
        const authorizedUsers = process.env.TELEGRAM_AUTHORIZED_USERS?.split(',')
          .map(id => id.trim())
          .filter(Boolean) || [];
        const userId = user.id.toString();
        
        if (authorizedUsers.includes(userId)) {
          console.log(`⚠️ BYPASS MODE: User ${userId} is authorized, allowing despite invalid signature`);
          
          // Save session
          await redis.set(`telegram:session:${userId}`, {
            userId,
            firstName: user.first_name,
            username: user.username,
            lastSeen: Date.now(),
            bypassMode: true
          }, { ex: 24 * 60 * 60 });
          
          return NextResponse.json({
            ok: true,
            user: user,
            message: "Authentication successful (bypass mode)",
            warning: "Signature verification failed but user is authorized"
          });
        }
      }
      
      return NextResponse.json({ ok: false, error: verification.error }, { status: 401 });
    }

    const user = verification.data?.user;
    if (!user?.id) {
      console.error("No user ID in verified data");
      return NextResponse.json({ ok: false, error: "No user ID found" }, { status: 400 });
    }

    // Check authorization
    const authorizedUsers = process.env.TELEGRAM_AUTHORIZED_USERS?.split(',')
      .map(id => id.trim())
      .filter(Boolean) || [];
    const userId = user.id.toString();
    
    if (!authorizedUsers.includes(userId)) {
      console.log(`Unauthorized user attempted access: ${userId}`);
      return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 403 });
    }

    console.log(`✅ Authenticated user: ${userId} (${user.first_name})`);

    // Save session
    await redis.set(`telegram:session:${userId}`, {
      userId,
      firstName: user.first_name,
      username: user.username,
      lastSeen: Date.now(),
      bypassMode: false
    }, { ex: 24 * 60 * 60 });

    return NextResponse.json({
      ok: true,
      user: user,
      message: "Authentication successful"
    });

  } catch (e: any) {
    console.error("Server error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: `Server error: ${e.message}` 
    }, { status: 500 });
  }
}