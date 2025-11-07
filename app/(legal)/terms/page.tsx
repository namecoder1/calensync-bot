const TermsPage = () => {

  return (
    <div>
      <h1>Termini e Condizioni</h1>
      <p>
        Benvenuto su CalenSync Bot. Utilizzando i nostri servizi, accetti i seguenti termini e condizioni:
      </p>
      <h2>1. Servizi Offerti</h2>
      <p>
        CalenSync Bot consente di sincronizzare i tuoi calendari Google con notifiche su Telegram. I dati raccolti sono utilizzati esclusivamente per fornire questo servizio. Non garantiamo la disponibilità continua del servizio e ci riserviamo il diritto di modificarlo o interromperlo in qualsiasi momento.
      </p>
      <h2>2. Dati Raccolti</h2>
      <p>
        Raccogliamo i seguenti dati:
        <ul>
          <li>Informazioni di autenticazione Google (token OAuth crittografati).</li>
          <li>Informazioni di autenticazione Telegram (ID utente, nome, username).</li>
          <li>Preferenze utente e configurazioni di calendario.</li>
        </ul>
        Questi dati sono necessari per fornire il servizio e migliorare l'esperienza utente.
      </p>
      <h2>3. Sicurezza</h2>
      <p>
        I tuoi dati sono protetti tramite crittografia e memorizzati in sistemi sicuri (Redis e Supabase). Non condividiamo i tuoi dati con terze parti, salvo ove richiesto dalla legge o per motivi di sicurezza.
      </p>
      <h2>4. Responsabilità dell'Utente</h2>
      <p>
        L'utente è responsabile di mantenere la sicurezza delle proprie credenziali di accesso e di non condividere il proprio account con altri. Qualsiasi attività svolta tramite il tuo account sarà considerata come effettuata da te.
      </p>
      <h2>5. Modifiche ai Termini</h2>
      <p>
        Ci riserviamo il diritto di aggiornare i termini in qualsiasi momento. Ti informeremo in caso di modifiche significative. Continuando a utilizzare il servizio dopo tali modifiche, accetti i nuovi termini.
      </p>
      <h2>6. Contatti</h2>
      <p>
        Per qualsiasi domanda o chiarimento sui presenti termini, puoi contattarci all'indirizzo email support@calensyncbot.com.
      </p>
    </div>
  );
};

export default TermsPage;