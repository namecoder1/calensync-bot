import { NextResponse } from "next/server";

export async function GET() {
  const devMode = process.env.DEV_MODE === 'true';
  
  return NextResponse.json({
    devMode,
    devUser: devMode ? {
      id: process.env.DEV_USER_ID || '562953005',
      first_name: process.env.DEV_USER_FIRST_NAME || 'Dev',
      last_name: process.env.DEV_USER_LAST_NAME || 'User'
    } : null
  });
}
