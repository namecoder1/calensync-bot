## 📱 Telegram Mini App Integration

This project uses the official Telegram Web Apps JS SDK:

- Official script: `https://telegram.org/js/telegram-web-app.js` (loaded in `app/layout.tsx`)
- A small hook `lib/useTelegramWebApp.ts` to access `window.Telegram.WebApp`
- API endpoint `app/api/auth/telegram/route.ts` to validate `initData` on the server

### Why the official SDK and not a React wrapper?

- The official SDK is tiny, stable, and framework-agnostic. A custom hook is enough for Next.js.
- Avoids extra dependencies while keeping full control over SSR/client boundaries.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui
- **Authentication**: Google OAuth 2.0 + Telegram Auth
- **Database**: Redis (Upstash)
- **Task Queue**: QStash for scheduled reminders
- **API**: Google Calendar API, Telegram Bot API

## 📋 Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Google Cloud Project with Calendar API enabled
- Telegram Bot Token
- Upstash Redis account
- Upstash QStash account

### Setting up Telegram Mini App

1. Create a Bot with @BotFather and obtain the bot token.
2. In BotFather, set the Web App URL to your hosted app URL (HTTPS):
   - Example (dev): use an HTTPS tunnel (e.g. `ngrok http http://localhost:3000`).
3. Create a `.env.local` with:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...your token...
   ```
4. Restart the dev server after changing env vars.

### How it works

- `app/layout.tsx` loads the Telegram script early so `window.Telegram.WebApp` is available in client components.
- `lib/useTelegramWebApp.ts` returns `webApp`, `user`, `themeParams`, and `isTelegram`.
- `app/page.tsx` shows a banner when opened inside Telegram and a "Connetti Telegram" button.
- Clicking the button sends `webApp.initData` to `POST /api/auth/telegram`.
- The API validates the signature (HMAC-SHA256) per Telegram docs and returns the verified user payload.

### Try it locally

1. Run the app.
2. Expose it over HTTPS (e.g., ngrok) and set that URL as your bot's Web App URL.
3. Open your bot in Telegram, tap the Web App button; you should see the Telegram banner and be able to connect.

### Next steps (optional)

- Create a proper session on successful verification (set a signed cookie/JWT).
- Use `webApp.MainButton`/`BackButton` for better UX and haptic feedback.
- Theme the UI using `themeParams` for light/dark parity with Telegram.

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_GROUP1_CHAT_ID=-1001234567890
TELEGRAM_GROUP2_CHAT_ID=-1009876543210

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# QStash
QSTASH_URL=your_qstash_url
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_CHAT_ID=your_telegram_chat_id

# Google Calendar (multiple calendars)
GOOGLE_CALENDAR_IDS=me@example.com,abcd1234@group.calendar.google.com
# OR use calendar names
GOOGLE_CALENDAR_NAMES=Generale,Gruppo 1,Gruppo 2

# Reminder System
REMINDER_GROUP1_CALENDARS=Gruppo 1
REMINDER_GROUP2_CALENDARS=Gruppo 2
REMINDER_DEFAULT_GROUP=general
REMINDER_DISPATCH_WINDOW_SEC=60

# Development
DEV_MODE=false
```

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/namecoder1/next-calendar.git
cd next-calendar
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📅 Google Calendar: Multiple Calendars

The `GET /api/calendar/events` endpoint supports fetching from multiple Google Calendars and merges events sorted by start date.

### Configuration Options

Use `.env.local`:

- `GOOGLE_CALENDAR_IDS`: Comma-separated list of calendar IDs (e.g., owner emails or internal IDs)
  - Example: `GOOGLE_CALENDAR_IDS=me@example.com,abcd1234@group.calendar.google.com`
- `GOOGLE_CALENDAR_NAMES`: Comma-separated list of calendar names (summary). Will be resolved via your Calendar List.
  - Example: `GOOGLE_CALENDAR_NAMES=Generale,Gruppo 1,Gruppo 2`
- Fallback legacy: `GOOGLE_CALENDAR_ID` (single calendar)

You can also pass query strings for quick tests:
- `GET /api/calendar/events?ids=id1,id2`
- `GET /api/calendar/events?names=Generale,Gruppo%201`

**Permissions**: Make sure you've authorized the app with the scope `https://www.googleapis.com/auth/calendar.readonly` (use the "Connetti Google" button).

## 📨 Telegram Reminder System (Gruppo Generale, Gruppo 1, Gruppo 2)

This project includes a server-side endpoint that sends reminders for your Google Calendar events to two Telegram groups, with simple logic to determine which group receives the reminder (Generale = both, Gruppo 1 or Gruppo 2).

### Components Added

- `lib/telegram.ts`: Helper to call Telegram Bot API (`sendMessage`).
- `lib/reminder-dispatcher.ts`: Fetch events, calculate "due" reminders, classify by group and send messages, with Redis deduplication.
- `GET /api/reminders/dispatch`: Endpoint that executes the dispatch when called.

### Redis (Upstash) for OAuth Tokens and Deduplication

- `lib/redis.ts`: Upstash client.
- `lib/google-tokens.ts`: Save/read Google OAuth tokens in Redis (key `google:oauth:tokens`).
- Deduplication: For each reminder sent, we write a key `reminder:sent:<eventId|minutes|minuteBucket>` with a 7-day TTL, so repeated calls don't duplicate sends.

### How It Decides Which Group to Send To

Rules in order of priority:

1. Tag in event title (case-insensitive):

## 📁 Project Structure	 - `[ALL]` o `[GENERALE]` -> invia ad entrambi i gruppi (Generale)

	 - `[G1]` o `[GRUPPO 1]` -> invia solo a Gruppo 1

```	 - `[G2]` o `[GRUPPO 2]` -> invia solo a Gruppo 2

next-calendar/2. Mapping per nome calendario (summary), configurabile via env:

├── app/                      # Next.js App Router	 - `REMINDER_GROUP1_CALENDARS` = lista di nomi calendario per Gruppo 1 (CSV)

│   ├── api/                 # API routes	 - `REMINDER_GROUP2_CALENDARS` = lista di nomi calendario per Gruppo 2 (CSV)

│   │   ├── auth/           # Authentication endpoints3. Default opzionale: `REMINDER_DEFAULT_GROUP` può essere `general` | `group1` | `group2`.

│   │   ├── calendar/       # Calendar events & tasks

│   │   └── reminders/      # Reminder dispatch systemSe nessuna regola si applica, il promemoria viene ignorato.

│   ├── layout.tsx          # Root layout

│   └── page.tsx            # Home page### Variabili d'ambiente richieste

├── components/              # React components

│   ├── blocks/             # Feature blocksNel file `.env.local` aggiungi:

│   └── ui/                 # UI components

├── lib/                     # Utility libraries```

│   ├── google-tokens.ts    # Google OAuth token managementTELEGRAM_BOT_TOKEN=123456:ABC-DEF... # Bot token

│   ├── redis.ts            # Redis clientTELEGRAM_GROUP1_CHAT_ID=-1001234567890

│   ├── telegram.ts         # Telegram bot utilitiesTELEGRAM_GROUP2_CHAT_ID=-1009876543210

│   └── reminder-dispatcher.ts

├── scripts/                 # Utility scripts# Opzionali

├── tests/                   # Test filesREMINDER_GROUP1_CALENDARS=Gruppo 1

└── docs/                    # DocumentationREMINDER_GROUP2_CALENDARS=Gruppo 2

```REMINDER_DEFAULT_GROUP=general

REMINDER_DISPATCH_WINDOW_SEC=60

## 🔐 Authentication Flow

# Upstash Redis

1. **Google OAuth**: Users authenticate via Google to access their calendarUPSTASH_REDIS_REST_URL=...

2. **Telegram Link**: Users connect their Telegram account to receive notificationsUPSTASH_REDIS_REST_TOKEN=...

3. **Admin Access**: Special admin features for authorized users```



## 🔔 Reminder SystemNote:



The application uses QStash for scheduled reminder dispatch:- I chat ID dei gruppi iniziano spesso con `-100`. Aggiungi il bot come membro ai due gruppi e assicurati che possa inviare messaggi.

- La "finestra" (`REMINDER_DISPATCH_WINDOW_SEC`) definisce quanti secondi prima di adesso vengono considerati "dovuti". Se pianifichi il trigger ogni minuto, 60s è appropriato.

1. Events are fetched from Google Calendar

2. Reminders are scheduled based on event times### Programmazione dell'invio (cron)

3. QStash triggers the reminder endpoint at the scheduled time

4. Telegram bot sends notification to the user- In locale, puoi creare un cron che colpisce `http://localhost:3000/api/reminders/dispatch` ogni minuto.

	Esempio con `crontab -e`:

### Setting up QStash Schedules

	```

```bash	* * * * * curl -sS http://localhost:3000/api/reminders/dispatch > /dev/null

node scripts/setup-qstash-schedules.js	```

```

- Su Vercel, usa [Vercel Cron](https://vercel.com/docs/cron-jobs) per chiamare l'endpoint ogni minuto:

## 🧪 Testing

	`vercel.json` (esempio):

The `tests/` directory contains various test utilities:

	```json

- `test-topics.js`: Test topic-based reminders	{

- `test-general-only.js`: Test general reminders		"crons": [

- `clear-redis-reminders.js`: Clear all reminders from Redis			{ "path": "/api/reminders/dispatch", "schedule": "* * * * *" }

- `scan-topics.js`: Scan all Redis topics		]

- `get-topic-ids.js`: Get topic IDs	}

	```

## 🔧 Development Mode

### Deduplica e affidabilità

Enable development mode for testing:

- Ogni promemoria ha una chiave basata su `eventId|minutes|minuteBucket` e, una volta inviato, viene registrato in Redis con TTL (7 giorni) per evitare duplicati anche in caso di più invocazioni.

```bash- In caso di errore durante l'invio, la chiave viene rimossa per consentire un retry al passaggio successivo.

# Check dev mode status

./scripts/check-dev-mode.sh### Formato messaggio



# Or via APIIl testo include:

curl http://localhost:3000/api/dev-mode-check

```- Titolo evento

- Orario di inizio

See [DEV_MODE.md](docs/DEV_MODE.md) for more details.- Offset del promemoria (es. "30 min prima")

- Link all'evento Google Calendar

## 📱 Telegram Bot Commands- Un estratto della descrizione (HTML rimosso)



The bot supports various commands through the Telegram interface:Se vuoi personalizzare il testo, modifica `buildMessage` in `lib/reminder-dispatcher.ts`.



- Connect/disconnect calendar
- View upcoming events
- Manage reminders
- Admin commands (for authorized users)

## 🎨 UI Components

Built with custom components and shadcn/ui:

- Button, Card, Drawer
- Dropdown Menu, Input, Label
- Select, Separator
- Toast notifications (Sonner)
- Safe HTML rendering

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t next-calendar .

# Run container
docker run -p 3000:3000 --env-file .env.local next-calendar
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Redis Connection Issues
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Check Upstash dashboard for connection status

### Google Calendar API Issues
- Ensure Calendar API is enabled in Google Cloud Console
- Verify OAuth credentials and redirect URI
- Check token expiration and refresh

### Telegram Bot Issues
- Verify bot token is correct
- Ensure bot is started by the user
- Check chat ID configuration

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and TypeScript
