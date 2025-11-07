#!/bin/bash

# Script per verificare lo stato del Dev Mode

echo "🔍 Verifica Modalità Sviluppo"
echo "================================"
echo ""

# Verifica se .env.local esiste
if [ ! -f .env.local ]; then
    echo "❌ File .env.local non trovato!"
    exit 1
fi

# Estrai il valore di DEV_MODE
DEV_MODE=$(grep "^DEV_MODE=" .env.local | cut -d '=' -f2)

if [ "$DEV_MODE" = "true" ]; then
    echo "✅ DEV_MODE: ATTIVO"
    echo ""
    
    # Mostra le informazioni dell'utente dev
    DEV_USER_ID=$(grep "^DEV_USER_ID=" .env.local | cut -d '=' -f2)
    DEV_USER_FIRST_NAME=$(grep "^DEV_USER_FIRST_NAME=" .env.local | cut -d '=' -f2)
    DEV_USER_LAST_NAME=$(grep "^DEV_USER_LAST_NAME=" .env.local | cut -d '=' -f2)
    
    echo "👤 Utente simulato:"
    echo "   ID: $DEV_USER_ID"
    echo "   Nome: $DEV_USER_FIRST_NAME $DEV_USER_LAST_NAME"
    echo ""
    
    # Verifica se l'utente è autorizzato
    AUTHORIZED_USERS=$(grep "^TELEGRAM_AUTHORIZED_USERS=" .env.local | cut -d '=' -f2)
    
    if [[ ",$AUTHORIZED_USERS," == *",$DEV_USER_ID,"* ]]; then
        echo "✅ L'utente DEV è nella lista TELEGRAM_AUTHORIZED_USERS"
    else
        echo "⚠️  ATTENZIONE: L'utente DEV NON è nella lista TELEGRAM_AUTHORIZED_USERS"
        echo "   Aggiungi $DEV_USER_ID a TELEGRAM_AUTHORIZED_USERS per accedere all'app"
    fi
    
    echo ""
    echo "⚠️  RICORDA: Non usare DEV_MODE=true in produzione!"
else
    echo "❌ DEV_MODE: DISATTIVO"
    echo ""
    echo "Per attivare la modalità sviluppo:"
    echo "1. Modifica .env.local"
    echo "2. Imposta DEV_MODE=true"
    echo "3. Riavvia il server di sviluppo"
fi

echo ""
echo "================================"
