import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Shield, Database, Users, Mail, FileText, Clock } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna all'app
          </Link>
          
          <div className="text-center mb-8">
            <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Informativa sulla Privacy</h1>
            <p className="text-lg text-gray-600">
              La tua privacy è la nostra priorità. Scopri come proteggiamo i tuoi dati.
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
              <Clock className="w-4 h-4 mr-1" />
              Ultimo aggiornamento: 7 Novembre 2025
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sezione 1 - Dati Raccolti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">1. Dati Raccolti</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Raccogliamo solo i dati essenziali per fornirti il miglior servizio possibile:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Autenticazione Google</h3>
                <p className="text-sm text-gray-600">Token OAuth crittografati per accedere ai tuoi calendari</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Informazioni Telegram</h3>
                <p className="text-sm text-gray-600">ID utente, nome e username per le notifiche</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Preferenze Utente</h3>
                <p className="text-sm text-gray-600">Configurazioni di calendario personalizzate</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Dati di Utilizzo</h3>
                <p className="text-sm text-gray-600">Statistiche anonime per migliorare il servizio</p>
              </div>
            </div>
          </Card>

          {/* Sezione 2 - Utilizzo dei Dati */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">2. Come Utilizziamo i Tuoi Dati</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full py-1.5 px-3 flex items-center mr-3 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Sincronizzazione Calendari</h3>
                  <p className="text-gray-600 text-sm">Connettere Google Calendar con Telegram per notifiche tempestive</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full py-1.5 px-3 flex items-center mr-3 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Personalizzazione Esperienza</h3>
                  <p className="text-gray-600 text-sm">Adattare l'app alle tue preferenze e abitudini</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full py-1.5 px-3 flex items-center mr-3 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Miglioramento Servizio</h3>
                  <p className="text-gray-600 text-sm">Analizzare l'utilizzo per sviluppare nuove funzionalità</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Sezione 3 - Protezione */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">3. Sicurezza e Protezione</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Crittografia Avanzata</h3>
                <p className="text-gray-600 text-sm mb-4">Tutti i dati sensibili sono crittografati con standard di sicurezza bancari.</p>
                
                <h3 className="font-medium text-gray-800 mb-3">Infrastruttura Sicura</h3>
                <p className="text-gray-600 text-sm">Utilizziamo Redis e Supabase per garantire la massima sicurezza.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Zero Condivisioni</h3>
                <p className="text-gray-600 text-sm mb-4">Non condividiamo mai i tuoi dati con terze parti, salvo obblighi legali.</p>
                
                <h3 className="font-medium text-gray-800 mb-3">Accesso Limitato</h3>
                <p className="text-gray-600 text-sm">Solo il personale autorizzato può accedere ai sistemi, con audit completi.</p>
              </div>
            </div>
          </Card>

          {/* Sezione 4 - Diritti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-2 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">4. I Tuoi Diritti</h2>
            </div>
            <p className="text-gray-600 mb-4">In conformità al GDPR, hai pieno controllo sui tuoi dati personali. Oltre ai diritti di accesso, modifica, cancellazione e revoca del consenso, puoi richiedere la portabilità dei dati e presentare reclamo al Garante Privacy.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Accesso ai Dati</h3>
                <p className="text-sm text-gray-600">Richiedi una copia completa di tutti i tuoi dati personali.</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Modifica/Correzione</h3>
                <p className="text-sm text-gray-600">Aggiorna o correggi informazioni imprecise.</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Cancellazione</h3>
                <p className="text-sm text-gray-600">Puoi eliminare definitivamente il tuo account e tutti i dati associati in qualsiasi momento tramite l'app o contattando il supporto. La cancellazione è irreversibile e viene eseguita entro 7 giorni dalla richiesta.</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Revoca Consenso</h3>
                <p className="text-sm text-gray-600">Interrompi l'utilizzo dei tuoi dati in qualsiasi momento.</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Portabilità</h3>
                <p className="text-sm text-gray-600">Richiedi la trasmissione dei tuoi dati personali in formato strutturato a un altro titolare.</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Reclamo</h3>
                <p className="text-sm text-gray-600">Puoi presentare reclamo all’Autorità Garante per la protezione dei dati personali.</p>
              </div>
            </div>
          </Card>

          {/* Sezioni rimanenti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Policy di Retention e Aggiornamenti</h2>
            <p className="text-gray-600 mb-4">
              I dati personali (token, log, configurazioni) vengono conservati solo per il tempo strettamente necessario all’erogazione del servizio e cancellati automaticamente dopo 12 mesi di inattività. Questa informativa può essere aggiornata periodicamente per riflettere modifiche al servizio o ai requisiti legali. Ti informeremo di qualsiasi cambiamento significativo tramite notifica nell'app.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Suggerimento:</strong> Aggiungi questa pagina ai preferiti per rimanere sempre aggiornato sulle nostre politiche.
              </p>
            </div>
          </Card>

          {/* Contatti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Mail className="w-6 h-6 mr-3" />
              <h2 className="text-2xl font-semibold">6. Hai Domande?</h2>
            </div>
            <p className="opacity-90">
              Il nostro team è sempre disponibile per chiarire qualsiasi dubbio sulla privacy, protezione dei tuoi dati o esercizio dei tuoi diritti.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <a href="mailto:privacy@calensyncbot.com">
                  <Mail className="w-4 h-4 mr-2" />
                  privacy@calensyncbot.com
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/terms">
                  Leggi i Termini di Servizio
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        <Separator className="my-8" />
        
        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} CalenSync Bot. Tutti i diritti riservati.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;