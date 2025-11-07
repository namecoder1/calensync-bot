import React from 'react';

const PrivacyPage = () => {
  return (
    <div>
      <h1>Informativa sulla Privacy</h1>
      <p>
        La tua privacy è importante per noi. Questa informativa descrive come raccogliamo, utilizziamo e proteggiamo i tuoi dati.
      </p>
      <h2>1. Dati Raccolti</h2>
      <p>
        Raccogliamo i seguenti dati:
        <ul>
          <li>Informazioni di autenticazione Google (token OAuth crittografati).</li>
          <li>Informazioni di autenticazione Telegram (ID utente, nome, username).</li>
          <li>Preferenze utente e configurazioni di calendario.</li>
        </ul>
        Questi dati sono raccolti per fornire il servizio e migliorare l'esperienza utente.
      </p>
      <h2>2. Utilizzo dei Dati</h2>
      <p>
        I dati raccolti sono utilizzati esclusivamente per:
        <ul>
          <li>Sincronizzare i calendari Google con notifiche su Telegram.</li>
          <li>Gestire le preferenze utente e configurazioni personalizzate.</li>
          <li>Analizzare l'utilizzo del servizio per miglioramenti futuri.</li>
        </ul>
      </p>
      <h2>3. Protezione dei Dati</h2>
      <p>
        I tuoi dati sono protetti tramite crittografia e memorizzati in sistemi sicuri. Utilizziamo Redis per la gestione dei token temporanei e Supabase per i dati persistenti. Non condividiamo i tuoi dati con terze parti, salvo ove richiesto dalla legge.
      </p>
      <h2>4. Diritti dell'Utente</h2>
      <p>
        Hai il diritto di:
        <ul>
          <li>Richiedere l'accesso ai tuoi dati personali.</li>
          <li>Richiedere la modifica o la cancellazione dei tuoi dati.</li>
          <li>Revocare il consenso all'utilizzo dei tuoi dati in qualsiasi momento.</li>
        </ul>
        Per esercitare questi diritti, contattaci all'indirizzo email privacy@calensyncbot.com.
      </p>
      <h2>5. Modifiche alla Privacy</h2>
      <p>
        Questa informativa potrebbe essere aggiornata periodicamente. Ti informeremo in caso di modifiche significative. Ti invitiamo a consultare regolarmente questa pagina per rimanere aggiornato.
      </p>
      <h2>6. Contatti</h2>
      <p>
        Per qualsiasi domanda o chiarimento sulla nostra informativa sulla privacy, puoi contattarci all'indirizzo email privacy@calensyncbot.com.
      </p>
    </div>
  );
};

export default PrivacyPage;