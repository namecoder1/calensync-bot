import { NextResponse } from "next/server";

// Endpoint deprecato/non più utilizzato: restituisce 410 Gone
export async function GET() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function PUT() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function DELETE() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
