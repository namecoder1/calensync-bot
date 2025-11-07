import { NextResponse } from "next/server";

// Endpoint alternativo deprecato: non più in uso
export async function GET() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
