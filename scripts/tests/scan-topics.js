require('dotenv').config({ path: '.env.local' });

const TELEGRAM_API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;

async function testTopicById(threadId, topicName) {
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  
  console.log(`\n📤 Tentativo invio al topic ${topicName} (thread_id: ${threadId})...`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        text: `✅ <b>Test ${topicName}</b>\nThread ID: ${threadId}`,
        parse_mode: 'HTML',
        message_thread_id: threadId,
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      console.log(`   ✅ Successo! Message ID: ${data.result.message_id}`);
      return true;
    } else {
      console.log(`   ❌ Errore: ${data.description}`);
      return false;
    }
    
  } catch (error) {
    console.error(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

async function scanAllTopics() {
  console.log("🔍 Scansione topic IDs...");
  console.log(`Group ID: ${groupId}\n`);
  
  const results = [];
  
  // Prova i primi 20 thread ID
  for (let i = 1; i <= 20; i++) {
    const success = await testTopicById(i, `Topic #${i}`);
    if (success) {
      results.push(i);
    }
    // Piccola pausa per evitare rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 Risultati:");
  console.log("=".repeat(50));
  
  if (results.length > 0) {
    console.log(`\n✅ Topic trovati con ID: ${results.join(', ')}`);
    console.log("\n💡 Controlla su Telegram in quale topic sono arrivati i messaggi!");
    console.log("   Poi aggiorna il .env.local con gli ID corretti.");
  } else {
    console.log("\n⚠️  Nessun topic trovato. Verifica la configurazione del gruppo.");
  }
}

scanAllTopics();
