import { NextResponse } from "next/server";

// Endpoint deprecato: mantenuto per compatibilitá ma non fornisce piú dati
export async function GET() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ ok: false, error: 'Endpoint deprecated' }, { status: 410 }); }
