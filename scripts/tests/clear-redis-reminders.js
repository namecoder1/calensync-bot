require('dotenv').config({ path: '.env.local' });
const Redis = require('@upstash/redis').Redis;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function clearReminderKeys() {
  console.log("🧹 Pulizia chiavi reminder in Redis...\n");
  
  try {
    // Usa keys invece di scan (va bene per poche chiavi)
    const keys = await redis.keys('reminder:sent:*');
    
    console.log(`📦 Trovate ${keys.length} chiavi da cancellare`);
    
    if (keys.length > 0) {
      for (const key of keys) {
        await redis.del(key);
        console.log(`  ✓ Cancellata: ${key}`);
      }
      console.log(`\n✅ Cancellate ${keys.length} chiavi di reminder`);
    } else {
      console.log("ℹ️  Nessuna chiave da cancellare");
    }
    
    console.log("💡 Ora puoi rilanciare il dispatcher manuale!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Errore:", error.message);
    process.exit(1);
  }
}

clearReminderKeys();
