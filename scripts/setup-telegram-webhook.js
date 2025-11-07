#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const TELEGRAM_API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN non trovato nel file .env.local");
  process.exit(1);
}

if (!appUrl) {
  console.error("❌ NEXT_PUBLIC_APP_URL non trovato nel file .env.local");
  process.exit(1);
}

async function setWebhook() {
  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  
  console.log("🔗 Impostazione webhook Telegram...");
  console.log(`📍 URL webhook: ${webhookUrl}`);
  
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"],
        drop_pending_updates: true
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log("✅ Webhook impostato con successo!");
      console.log(`📋 Descrizione: ${result.description}`);
    } else {
      console.error("❌ Errore nell'impostazione del webhook:");
      console.error(result);
    }
  } catch (error) {
    console.error("❌ Errore di rete:", error);
  }
}

async function getWebhookInfo() {
  console.log("\n📊 Informazioni webhook correnti:");
  
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      const info = result.result;
      console.log(`📍 URL: ${info.url || "Nessun webhook impostato"}`);
      console.log(`✅ Ultimo errore: ${info.last_error_message || "Nessun errore"}`);
      console.log(`📅 Ultima chiamata: ${info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString() : "N/A"}`);
      console.log(`📨 Aggiornamenti pendenti: ${info.pending_update_count || 0}`);
    } else {
      console.error("❌ Errore nel recupero info webhook:", result);
    }
  } catch (error) {
    console.error("❌ Errore di rete:", error);
  }
}

async function main() {
  await setWebhook();
  await getWebhookInfo();
}

main();