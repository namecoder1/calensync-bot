/**
 * Script per configurare i cron jobs su Upstash QStash
 * 
 * Configura 4 esecuzioni giornaliere ben distribuite:
 * - 07:00 (mattina presto)
 * - 12:00 (pausa pranzo)
 * - 16:00 (pomeriggio)
 * - 20:00 (sera)
 * 
 * Uso: node scripts/setup-qstash-schedules.js
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Client } from '@upstash/qstash';

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const BASE_URL = process.env.NEXTAUTH_URL || 'https://next-calendar-chi.vercel.app';
const ENDPOINT = `${BASE_URL}/api/reminders/qstash`;

if (!QSTASH_TOKEN) {
  console.error('❌ QSTASH_TOKEN non trovato nelle variabili d\'ambiente!');
  process.exit(1);
}

const client = new Client({ token: QSTASH_TOKEN });

const schedules = [
  {
    id: 'reminder-dispatch-07',
    cron: 'CRON_TZ=Europe/Rome 0 7 * * *',
    description: 'Dispatch promemoria ore 7:00 (mattina)',
  },
  {
    id: 'reminder-dispatch-12',
    cron: 'CRON_TZ=Europe/Rome 0 12 * * *',
    description: 'Dispatch promemoria ore 12:00 (pranzo)',
  },
  {
    id: 'reminder-dispatch-16',
    cron: 'CRON_TZ=Europe/Rome 0 16 * * *',
    description: 'Dispatch promemoria ore 16:00 (pomeriggio)',
  },
  {
    id: 'reminder-dispatch-20',
    cron: 'CRON_TZ=Europe/Rome 0 20 * * *',
    description: 'Dispatch promemoria ore 20:00 (sera)',
  },
];

async function setupSchedules() {
  console.log('🚀 Configurazione schedules su Upstash QStash...\n');
  console.log(`📍 Endpoint: ${ENDPOINT}\n`);

  for (const schedule of schedules) {
    try {
      console.log(`⏰ Creando schedule: ${schedule.description}`);
      console.log(`   ID: ${schedule.id}`);
      console.log(`   Cron: ${schedule.cron}`);

      const result = await client.schedules.create({
        destination: ENDPOINT,
        cron: schedule.cron,
        scheduleId: schedule.id,
        retries: 2, // Retry fino a 2 volte in caso di errore
        body: JSON.stringify({
          source: 'qstash-schedule',
          scheduleId: schedule.id,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`   ✅ Creato con successo!`);
      console.log(`   Schedule ID: ${result.scheduleId}\n`);
    } catch (error) {
      console.error(`   ❌ Errore durante la creazione:`, error.message);
      console.error(`      ${error}\n`);
    }
  }

  console.log('📋 Riepilogo schedules attivi:\n');
  try {
    const allSchedules = await client.schedules.list();
    
    if (allSchedules.length === 0) {
      console.log('   Nessuno schedule trovato.');
    } else {
      allSchedules.forEach((s) => {
        console.log(`   • ${s.scheduleId || s.id}`);
        console.log(`     Cron: ${s.cron}`);
        console.log(`     Destination: ${s.destination}`);
        console.log(`     Created: ${new Date(s.createdAt * 1000).toLocaleString('it-IT')}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Errore nel recupero degli schedules:', error.message);
  }

  console.log('✅ Setup completato!');
  console.log('\n💡 Puoi gestire i tuoi schedules dalla console: https://console.upstash.com/qstash');
}

setupSchedules().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
