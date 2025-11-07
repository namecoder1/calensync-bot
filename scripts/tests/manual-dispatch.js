#!/usr/bin/env node

// Simple script to trigger manual dispatch via API
// Usage:
//   BASE_URL=http://localhost:3000 USER_ID=123 node scripts/tests/manual-dispatch.js
// or
//   node scripts/tests/manual-dispatch.js http://localhost:3000 123

const [,, argBase, argUser] = process.argv;
const BASE_URL = process.env.BASE_URL || argBase || 'http://localhost:3000';
const USER_ID = process.env.USER_ID || argUser;

if (!USER_ID) {
  console.error('Missing USER_ID. Provide as env USER_ID or second arg.');
  process.exit(1);
}

async function main() {
  const url = `${BASE_URL.replace(/\/$/, '')}/api/reminders/dispatch`;
  console.log(`POST ${url} { userId: ${USER_ID} }`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      console.error('Dispatch failed:', json.error || res.statusText);
      process.exit(2);
    }
    console.log('Dispatch result:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Network error:', e.message || String(e));
    process.exit(3);
  }
}

main();
