import { NextResponse } from "next/server";

// Endpoint deprecato: la disconnessione Google non è più esposta via API pubblica
export async function GET() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function DELETE() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }