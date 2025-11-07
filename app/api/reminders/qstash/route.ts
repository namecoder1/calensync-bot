import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { dispatchDueReminders } from "@/lib/reminder-dispatcher";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint protetto chiamato da Upstash QStash
 * La firma viene verificata automaticamente dal middleware
 */
async function handler(req: NextRequest) {
  try {
    console.log("[QStash] Received scheduled reminder dispatch request");
    
    const result = await dispatchDueReminders(new Date(), { mode: 'auto' });
    
    console.log("[QStash] Dispatch completed:", result);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[QStash] Error dispatching reminders:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Avvolgi l'handler con la verifica della firma QStash
export const POST = verifySignatureAppRouter(handler);

// Permetti GET per test manuali (opzionale, ma utile per debug)
export async function GET() {
  return NextResponse.json({
    message: "QStash reminder endpoint is active. Use POST from QStash schedules.",
    timestamp: new Date().toISOString(),
  });
}
