require('dotenv').config({ path: '.env.local' });

const TELEGRAM_API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;

async function testGeneral() {
  console.log("🧪 Test invio al topic General (senza message_thread_id)...\n");
  
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        text: '✅ <b>Test General Topic</b>\nSe vedi questo messaggio, il bot funziona ma potrebbe non avere i permessi per i topic.',
        parse_mode: 'HTML',
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      console.log("✅ Messaggio inviato con successo!");
      console.log(`   Message ID: ${data.result.message_id}`);
      if (data.result.message_thread_id) {
        console.log(`   Thread ID: ${data.result.message_thread_id}`);
      }
    } else {
      console.log("❌ Errore:", data.description);
    }
    
  } catch (error) {
    console.error("❌ Errore:", error.message);
  }
}

testGeneral();
