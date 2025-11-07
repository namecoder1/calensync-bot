require('dotenv').config({ path: '.env.local' });

const TELEGRAM_API_BASE = "https://api.telegram.org";

async function sendTelegramMessage(chatId, text, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN env var");

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode ?? "HTML",
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
    disable_notification: opts.disable_notification ?? false,
  };

  if (opts.message_thread_id !== undefined) {
    body.message_thread_id = opts.message_thread_id;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return res.json();
}

async function testTopics() {
  const groupId = process.env.TELEGRAM_GROUP_ID || "";
  const topicGeneral = parseInt(process.env.TELEGRAM_TOPIC_GENERAL || "1", 10);
  const topicRdB = parseInt(process.env.TELEGRAM_TOPIC_RDB || "2", 10);
  const topicRdC = parseInt(process.env.TELEGRAM_TOPIC_RDC || "3", 10);

  console.log("🧪 Test invio messaggi nei topic...\n");
  console.log(`Group ID: ${groupId}`);
  console.log(`Topic General: ${topicGeneral}`);
  console.log(`Topic RdB: ${topicRdB}`);
  console.log(`Topic RdC: ${topicRdC}\n`);

  try {
    // Test Topic General
    console.log("📤 Invio messaggio al topic General...");
    await sendTelegramMessage(groupId, "✅ <b>Test Topic General</b>\nQuesto è un messaggio di test per il topic General.", {
      message_thread_id: topicGeneral,
    });
    console.log("✅ Messaggio inviato al topic General\n");

    // Test Topic RdB
    console.log("📤 Invio messaggio al topic RdB...");
    await sendTelegramMessage(groupId, "✅ <b>Test Topic RdB</b>\nQuesto è un messaggio di test per il topic RdB.", {
      message_thread_id: topicRdB,
    });
    console.log("✅ Messaggio inviato al topic RdB\n");

    // Test Topic RdC
    console.log("📤 Invio messaggio al topic RdC...");
    await sendTelegramMessage(groupId, "✅ <b>Test Topic RdC</b>\nQuesto è un messaggio di test per il topic RdC.", {
      message_thread_id: topicRdC,
    });
    console.log("✅ Messaggio inviato al topic RdC\n");

    console.log("🎉 Tutti i test completati con successo!");
  } catch (error) {
    console.error("❌ Errore durante il test:", error.message);
    process.exit(1);
  }
}

testTopics();
