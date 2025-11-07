import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText, Zap, Shield, UserCheck, Settings, Mail, AlertTriangle } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna all'app
          </Link>
          
          <div className="text-center mb-8">
            <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Termini e Condizioni</h1>
            <p className="text-lg text-gray-600">
              Le regole semplici e chiare per utilizzare CalenSync Bot.
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
              <FileText className="w-4 h-4 mr-1" />
              Versione 1.0 - 7 Novembre 2024
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Benvenuto */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Benvenuto su CalenSync Bot</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Utilizzando i nostri servizi, accetti i seguenti termini e condizioni. Li abbiamo scritti in modo semplice e comprensibile.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                <strong>Nota importante:</strong> Questi termini sono progettati per proteggere sia te che noi, garantendo un servizio sicuro e affidabile.
              </p>
            </div>
          </Card>

          {/* Sezione 1 - Servizi Offerti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">1. Servizi Offerti</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Sincronizzazione Intelligente</h3>
                <p className="text-gray-600 text-sm mb-4">Connetti Google Calendar con Telegram per ricevere notifiche automatiche sui tuoi eventi.</p>
                
                <h3 className="font-medium text-gray-800 mb-3">Personalizzazione</h3>
                <p className="text-gray-600 text-sm">Configura promemoria, gruppi e preferenze secondo le tue esigenze.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Mini App Telegram</h3>
                <p className="text-gray-600 text-sm mb-4">Esperienza integrata direttamente nel tuo client Telegram preferito.</p>
                
                <h3 className="font-medium text-gray-800 mb-3">Sicurezza Garantita</h3>
                <p className="text-gray-600 text-sm">Tutti i dati sono crittografati e protetti con standard di sicurezza elevati.</p>
              </div>
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-amber-800 mb-1">Disponibilità del Servizio</h3>
                  <p className="text-amber-700 text-sm">
                    Facciamo del nostro meglio per garantire un servizio sempre attivo, ma ci riserviamo il diritto di effettuare manutenzioni o modifiche quando necessario.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Sezione 2 - Dati e Privacy */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">2. Dati e Privacy</h2>
            </div>
            
            <p className="text-gray-600 mb-4">I dati che raccogliamo sono strettamente necessari per il funzionamento del servizio:</p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-2">Autenticazione Google</h3>
                <p className="text-sm text-purple-700">Token OAuth crittografati per accedere ai calendari (solo lettura)</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-2">Informazioni Telegram</h3>
                <p className="text-sm text-purple-700">ID, nome e username per inviare notifiche personalizzate</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-2">Preferenze</h3>
                <p className="text-sm text-purple-700">Impostazioni di calendario e notifiche per migliorare l'esperienza</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-2">Statistiche Anonime</h3>
                <p className="text-sm text-purple-700">Dati aggregati per migliorare le funzionalità del servizio</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                🔒 <strong>Garanzia di Privacy:</strong> I tuoi dati non vengono mai condivisi con terze parti e sono protetti con crittografia end-to-end.
              </p>
            </div>
          </Card>

          {/* Sezione 3 - Sicurezza */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">3. Sicurezza e Protezione</h2>
            </div>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-gray-800 mb-2">Infrastruttura Sicura</h3>
                <p className="text-gray-600 text-sm">Utilizziamo Redis e Supabase, piattaforme certificate per la sicurezza dei dati aziendali.</p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-800 mb-2">Crittografia Avanzata</h3>
                <p className="text-gray-600 text-sm">Tutti i dati sensibili sono crittografati sia in transito che a riposo.</p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-medium text-gray-800 mb-2">Accesso Controllato</h3>
                <p className="text-gray-600 text-sm">Solo il personale autorizzato può accedere ai sistemi, con log completi di tutte le attività.</p>
              </div>
            </div>
          </Card>

          {/* Sezione 4 - Responsabilità dell'Utente */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-2 rounded-lg mr-3">
                <UserCheck className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">4. Le Tue Responsabilità</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-orange-100 text-orange-600 rounded-full p-1 mr-3 mt-1">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Sicurezza del Tuo Account</h3>
                  <p className="text-gray-600 text-sm">Mantieni sicure le credenziali di accesso e non condividere mai il tuo account.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 mt-1">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Uso Appropriato</h3>
                  <p className="text-gray-600 text-sm">Utilizza il servizio solo per scopi legittimi e nel rispetto delle nostre linee guida.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-1">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Segnalazione Problemi</h3>
                  <p className="text-gray-600 text-sm">Segnala tempestivamente eventuali problemi di sicurezza o malfunzionamenti.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Sezione 5 - Modifiche */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">5. Aggiornamenti ai Termini</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Possiamo aggiornare questi termini per riflettere nuove funzionalità o requisiti legali. 
              Ti notificheremo sempre i cambiamenti importanti.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-medium text-indigo-800 mb-2">Notifiche Trasparenti</h3>
                <p className="text-sm text-indigo-700">Ti avviseremo tramite l'app di qualsiasi modifica significativa</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-medium text-indigo-800 mb-2">Tempo per Decidere</h3>
                <p className="text-sm text-indigo-700">Avrai sempre tempo per valutare i nuovi termini prima che entrino in vigore</p>
              </div>
            </div>
          </Card>

          {/* Contatti */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Mail className="w-6 h-6 mr-3" />
              <h2 className="text-2xl font-semibold">6. Supporto e Contatti</h2>
            </div>
            <p className="opacity-90">
              Hai domande sui termini di servizio o hai bisogno di supporto? Il nostro team è qui per aiutarti.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <a href="mailto:support@calensyncbot.com">
                  <Mail className="w-4 h-4 mr-2" />
                  support@calensyncbot.com
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/privacy">
                  Leggi la Privacy Policy
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

export default TermsPage;