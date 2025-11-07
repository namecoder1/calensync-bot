import { NextResponse } from "next/server";

// Endpoint deprecato: usare /api/user/status
export async function GET() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated — use /api/user/status' }, { status: 410 }); }