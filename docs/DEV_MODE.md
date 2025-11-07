# Modalità Sviluppo (Dev Mode)

## Descrizione

La modalità sviluppo permette di testare l'applicazione localmente senza dover configurare Telegram Mini App o avere un account Telegram attivo. Quando abilitata, bypassa completamente l'autenticazione Telegram e simula un utente autorizzato.

## Attivazione

Per attivare la modalità sviluppo, aggiungi queste variabili nel file `.env.local`:

```bash
# Modalità sviluppo - bypassa l'autenticazione Telegram (solo per dev!)
DEV_MODE=true
DEV_USER_ID=562953005
DEV_USER_FIRST_NAME=Dev
DEV_USER_LAST_NAME=User
```

## Cosa fa la modalità sviluppo?

Quando `DEV_MODE=true`:

1. ✅ **Bypassa l'autenticazione Telegram**: Non è necessario aprire l'app da Telegram
2. ✅ **Simula un utente autorizzato**: Usa i dati in `DEV_USER_*` come utente corrente
3. ✅ **Permette l'accesso alla home page**: Anche senza Mini App attiva
4. ✅ **Mostra un badge visivo**: Indica chiaramente che sei in dev mode
5. ✅ **Nasconde il banner Telegram**: Non mostra i pulsanti "Connetti Telegram"

## Caratteristiche di sicurezza

- 🔒 La modalità dev è **solo lato client** per il bypass UI
- 🔒 Gli endpoint API **continuano a verificare** l'autorizzazione dell'utente
- 🔒 Il `DEV_USER_ID` deve essere nella lista `TELEGRAM_AUTHORIZED_USERS`
- 🔒 In produzione, `DEV_MODE` è **sempre false** (non deve mai essere true su Vercel)

## Come usarlo

1. **Imposta le variabili** nel `.env.local`:
   ```bash
   DEV_MODE=true
   DEV_USER_ID=562953005  # Usa un ID dalla lista TELEGRAM_AUTHORIZED_USERS
   ```

2. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```

3. **Apri il browser** su `http://localhost:3000`

4. **Verifica il badge arancione** che indica "MODALITÀ SVILUPPO ATTIVA"

## Disattivazione

Per disattivare la modalità sviluppo, imposta:

```bash
DEV_MODE=false
```

oppure rimuovi completamente la variabile dal `.env.local`.

## ⚠️ IMPORTANTE

**NON impostare mai `DEV_MODE=true` in produzione!**

La modalità sviluppo è pensata **esclusivamente per l'ambiente locale**. Se attivata in produzione, permetterebbe a chiunque di accedere all'applicazione senza autenticazione.

## Risoluzione problemi

### "Accesso Negato" anche con DEV_MODE=true

Verifica che:
- Il `DEV_USER_ID` sia presente in `TELEGRAM_AUTHORIZED_USERS`
- Il server sia stato riavviato dopo aver modificato `.env.local`
- Non ci siano errori nella console del browser

### Il badge arancione non appare

- Controlla la console del browser per errori
- Verifica che l'endpoint `/api/dev-mode-check` risponda correttamente
- Riavvia il server di sviluppo

## Endpoint API

### GET `/api/dev-mode-check`

Restituisce lo stato della modalità sviluppo:

```json
{
  "devMode": true,
  "devUser": {
    "id": "562953005",
    "first_name": "Dev",
    "last_name": "User"
  }
}
```
