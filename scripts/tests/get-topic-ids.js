require('dotenv').config({ path: '.env.local' });

const TELEGRAM_API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;

async function getUpdates() {
  console.log("🔍 Recupero gli ultimi messaggi per trovare i topic ID...\n");
  console.log("📝 Ora invia un messaggio in CIASCUN topic del supergruppo.");
  console.log("   Poi premi INVIO per continuare...\n");
  
  // Aspetta che l'utente prema invio
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  const url = `${TELEGRAM_API_BASE}/bot${token}/getUpdates`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.ok) {
      console.error("❌ Errore:", data.description);
      return;
    }

    console.log("\n📨 Messaggi ricevuti:\n");
    
    const topics = new Map();
    
    for (const update of data.result) {
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const threadId = msg.message_thread_id;
        const text = msg.text || msg.caption || '(media)';
        const chatTitle = msg.chat.title;
        
        if (chatId.toString().includes(groupId.replace('-100', ''))) {
          console.log(`Chat: ${chatTitle}`);
          console.log(`  Chat ID: ${chatId}`);
          console.log(`  Thread ID: ${threadId || 'N/A (General topic)'}`);
          console.log(`  Testo: ${text.substring(0, 50)}...`);
          console.log('');
          
          if (threadId) {
            topics.set(threadId, { chatId, text: text.substring(0, 30) });
          }
        }
      }
    }

    if (topics.size > 0) {
      console.log("\n✅ Topic ID trovati:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      for (const [threadId, info] of topics) {
        console.log(`Thread ID: ${threadId}`);
      }
      console.log("\n💡 Aggiorna il tuo .env.local con questi valori!");
    } else {
      console.log("\n⚠️  Nessun topic trovato. Assicurati di:");
      console.log("   1. Aver inviato messaggi nei topic");
      console.log("   2. Il bot sia nel gruppo");
      console.log("   3. Il bot sia amministratore con permessi topic");
    }

  } catch (error) {
    console.error("❌ Errore:", error.message);
  }
}

getUpdates();
