"use client"

import { useEffect, useState, useRef } from "react"
import { MdOutlineLockPerson } from "react-icons/md";
import { EventType } from "@/types"
import { FaGoogle, FaTelegramPlane } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { TbReload} from "react-icons/tb";
import { TailSpin } from "react-loader-spinner";
import RemindersList from "@/components/blocks/reminders-list";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";
import { RiInformation2Line } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { GrSend } from "react-icons/gr";
import QRCodeStyling, { Options } from "qr-code-styling";
import {QRCodeCanvas} from 'qrcode.react';
import Link from "next/link";
import { Footer } from "@/components/footer";


export default function EventsPage() {
  const router = useRouter()
  const { user, isTelegram, webApp, devMode: telegramDevMode } = useTelegramWebApp()
  const [events, setEvents] = useState<EventType[]>([])
  const [calendarAuthIssue, setCalendarAuthIssue] = useState<string | null>(null)
  // Su Telegram, iniziamo sempre come autorizzati e saltiamo il passaggio di connessione
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [telegramAuthDone, setTelegramAuthDone] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [qrCode, setQrCode] = useState<QRCodeStyling>();
  const ref = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<Options>({
    width: 300,
    height: 300,
    type: 'svg',
    data: 'https://web.telegram.org/k/#@calensyncbot',
    image: '/telegram.svg',
    margin: 0,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: 'Q'
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.8,
      margin: 10,
      crossOrigin: 'anonymous',
      saveAsBlob: true,
    },
    dotsOptions: {
      color: '#25A2E0',
      type: 'extra-rounded'
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#06557d'
    },
    cornersSquareOptions: {
      type: 'dot',
      color: '#267eab',
    },
    backgroundOptions: {
      color: '#fff',
    },
  });

  useEffect(() => {
    // Non serve più controllare se l'utente è admin
    // Qualsiasi utente Telegram può usare l'app
    if (user?.id && isTelegram) {
      setIsAdmin(true); // Tratta tutti gli utenti come admin per ora
      setCheckingAdmin(false);
    }
  }, [user, isTelegram]);

  const [mounted, setMounted] = useState(false);

  // Crea l'istanza di QRCodeStyling
  useEffect(() => {
    setQrCode(new QRCodeStyling(options));
  }, []);

  // Appendi il QR code al DOM
  useEffect(() => {
    if (ref.current && qrCode) {
      qrCode.append(ref.current);
    }
  }, [qrCode]);

  // Aggiorna il QR code quando cambiano le opzioni
  useEffect(() => {
    if (qrCode) {
      qrCode.update(options);
    }
  }, [qrCode, options]);

  // Aspetta che il componente sia montato
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasValidTelegramData = webApp && webApp.initData && webApp.initData.length > 0;
  const showQRCode = mounted && !telegramDevMode && !hasValidTelegramData;

  // Effettua automaticamente l'autenticazione Telegram lato server quando possibile
  useEffect(() => {
    const autoAuthTelegram = async () => {
      if (!isTelegram || telegramAuthDone) return;
      if (!webApp?.initData || webApp.initData.length === 0) return;
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: webApp.initData })
        });
        // Non bloccare il flusso su errori: log e continua
        try {
          const data = await res.json();
          if (!res.ok || !data?.ok) {
            console.warn("Auto Telegram auth failed:", data?.error || res.statusText);
          }
        } catch {}
      } catch (e) {
        console.warn("Auto Telegram auth request error:", e);
      } finally {
        setTelegramAuthDone(true);
      }
    };
    autoAuthTelegram();
  }, [isTelegram, webApp, telegramAuthDone]);

  const triggerDispatch = async () => {
    if (!user) return;
    
    const confirmed = confirm(
      "Questo invierà TUTTI i promemoria di OGGI (passati e futuri).\n\n" +
      "I promemoria già inviati verranno saltati automaticamente.\n\n" +
      "Vuoi continuare?"
    );
    
    if (!confirmed) return;
    
    try {
      const res = await fetch("/api/reminders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      
      if (data.ok) {
        const message = 
          `✅ Dispatch Manuale Completato!\n\n` +
          `📤 Messaggi inviati: ${data.sent || 0}\n` +
          `⏭️ Saltati (già inviati): ${data.skipped || 0}\n` +
          `📊 Totale trovati: ${data.totalDue || 0}\n` +
          `${data.errors?.length ? `\n⚠️ Errori: ${data.errors.length}` : ''}`;
        alert(message);
      } else {
        alert(`❌ Errore nel dispatch:\n${data.error || 'Errore sconosciuto'}`);
      }
    } catch (e: any) {
      alert("❌ Errore di rete: " + e.message);
    }
  };

  const handleReload = () => {
    if (!user) return;
    window.location.reload();
  };

  // Verifica autorizzazione
  useEffect(() => {
    // Se siamo su Telegram, sempre autorizzato automaticamente
    if (isTelegram) {
      console.log("🟢 Su Telegram - autorizzazione automatica");
      setIsAuthorized(true);
      setCheckingAuth(false);
      return;
    }
    
    // Se non siamo su Telegram, controlla solo dev mode
    const checkDevMode = async () => {
      try {
        const devModeRes = await fetch('/api/dev-mode-check');
        const devModeData = await devModeRes.json();
        setDevMode(devModeData.devMode);
        setIsAuthorized(devModeData.devMode);
      } catch {
        setDevMode(false);
        setIsAuthorized(false);
      }
      setCheckingAuth(false);
    };

    checkDevMode();
  }, [isTelegram]);

  useEffect(() => {
    // Auto-controllo dello stato di autenticazione Google quando siamo su Telegram
    const checkGoogleAuth = async () => {
      try {
        const authRes = await fetch('/api/auth/status');
        const authData = await authRes.json();
        
        if (!authData.hasTokens) {
          // Se non ha token Google, mostra la schermata di onboarding Google
          setCalendarAuthIssue("Connetti Google Calendar per sincronizzare i tuoi eventi.");
          return;
        }
        
        // Se ha i token, prova a caricare gli eventi
        const eventsRes = await fetch("/api/calendar/events");
        
        if (!eventsRes.ok) {
          try {
            const data = await eventsRes.json();
            setCalendarAuthIssue(
              data?.message || "Autorizza l'accesso a Google Calendar per vedere gli eventi."
            );
          } catch {}
          setEvents([]);
          return;
        }
        
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        setCalendarAuthIssue(null);
      } catch (error) {
        console.error("Errore nel controllo auth Google:", error);
        setEvents([]);
      }
    };

    // Solo se siamo autorizzati (su Telegram o dev mode)
    if (isAuthorized) {
      checkGoogleAuth();
    }
  }, [isAuthorized]);

  // Se non siamo montati ancora, mostra un loader
  if (!mounted) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TailSpin
            visible={true}
            height="80"
            width="80"
            color="#1ca34d"
            ariaLabel="tail-spin-loading"
            radius="1"
            wrapperStyle={{}}
            wrapperClass="mx-auto w-fit mb-4"
          />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Se non siamo su Telegram e non in dev mode, mostra SOLO il QR code
  if (showQRCode) {
    console.log("🔵 Rendering QR Code (not on Telegram)");
    return (
      <div className="max-w-sm mx-auto text-center flex flex-col items-center justify-center min-h-screen">
        <h1 className="font-bold text-3xl tracking-tight">Accedi tramite Telegram</h1>
        <p className="mt-2 text-muted-foreground mb-10">Scansiona il QR code qui sotto per aprire il bot su Telegram:</p>
        <div className="p-4 border rounded-4xl">
          <div ref={ref} />
        </div>
        <div className="px-4 pt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-card text-muted-foreground">Or</span>
            </div>
          </div>
          <Button asChild variant='outline'>
            <Link href="https://web.telegram.org/k/#@calensyncbot">
              <FaTelegramPlane />
              Apri su Telegram
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Aspettiamo che webApp sia caricato se siamo su Telegram
  if (isTelegram && !webApp && !telegramDevMode) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TailSpin
            visible={true}
            height="80"
            width="80"
            color="#1ca34d"
            ariaLabel="tail-spin-loading"
            radius="1"
            wrapperStyle={{}}
            wrapperClass="mx-auto w-fit mb-4"
          />
          <p className="text-muted-foreground">Connessione a Telegram...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (checkingAuth) {
      return (
        <div className="p-6 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <TailSpin
              visible={true}
              height="80"
              width="80"
              color="#1ca34d"
              ariaLabel="tail-spin-loading"
              radius="1"
              wrapperStyle={{}}
              wrapperClass="mx-auto w-fit mb-4"
            />
            <p className="text-muted-foreground">Verifica autorizzazione in corso...</p>
          </div>
        </div>
      );
    }

    if (!isAuthorized) {
      // Se non siamo su Telegram, mostra la schermata di connessione Telegram
      if (!isTelegram) {
        return (
          <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="bg-blue-300/40 p-2 mb-1.5 rounded-xl border border-blue-800">
                <FaTelegramPlane size={32} className="mx-auto" color="darkblue" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Connessione Richiesta</h1>
              <p className="text-muted-foreground">
                Connetti il tuo account Telegram per usare l'app.
              </p>
            </div>
            <div className="bg-blue-50 border border-dashed border-blue-200 max-w-sm rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2"><RiInformation2Line /> Come accedere:</p>
              <p>Questa app funziona solo come Telegram Mini App. Apri l'app tramite Telegram.</p>
            </div>
          </div>
        );
      }
      
      // Se siamo su Telegram ma non abbiamo ancora completato l'autorizzazione
      // mostra un loader (evita schermata bianca in caso di race-condition)
      return (
        <div className="p-6 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <TailSpin
              visible={true}
              height="80"
              width="80"
              color="#1ca34d"
              ariaLabel="tail-spin-loading"
              radius="1"
              wrapperStyle={{}}
              wrapperClass="mx-auto w-fit mb-4"
            />
            <p className="text-muted-foreground">Connessione a Telegram in corso...</p>
          </div>
        </div>
      );
    }

    if (calendarAuthIssue) {
      return (
        <div className="p-6 min-h-screen flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center mb-8 max-w-sm text-center">
            <div className="bg-green-100 p-3 mb-4 rounded-xl border border-green-300">
              <FaGoogle size={32} className="mx-auto" color="#4285f4" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isTelegram && user ? `👋 Ciao ${user.first_name}!` : "Benvenuto!"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {calendarAuthIssue}
            </p>
            <Button
              onClick={() => router.push("/api/auth/google")}
              size="lg"
              className="w-full"
            >
              <FaGoogle />
              Connetti Google Calendar
            </Button>
            {isTelegram && (
              <p className="text-xs text-muted-foreground mt-4">
                Questo passaggio è necessario solo la prima volta
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        {user ? (
          <section>
            <h2>Connessione con Telegram</h2>
            <p>Sei connesso come: <strong>{user.username || user.id}</strong></p>
          </section>
        ) : (
          <div className="mb-4 p-3 min-h-screen flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tracking-tight mb-4">Token Google mancanti. Premi 'Connetti Google' per autenticarti.</span>
            <Button
              onClick={() => router.push("/api/auth/google")}
            >
              <FaGoogle />
              Connetti Google
            </Button>
          </div>
        )}

        <section>
          <nav className="p-4 border-b border-border mb-6 flex items-center justify-between">
            <h1 className="font-bold text-2xl tracking-tight flex items-center">Dashboard</h1>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant='outline'
                onClick={handleReload}
              >
                <TbReload />
                <span className="hidden sm:block">Reload</span>
              </Button>
              <Button
                disabled={!user || devMode}
                onClick={triggerDispatch}
              >
                <GrSend />
                <span className="hidden sm:block">Manual send</span>
              </Button>
            </div>
          </nav>
          <div className="px-4">
            {/* Rimuoviamo il TelegramBanner perché ora l'autenticazione Telegram è automatica */}
            <RemindersList events={events} />
          </div>
        </section>
        
        <Footer />
      </div>
    );
  };

  // Se siamo su Telegram, mostra il contenuto normale
  console.log("🟢 Rendering normal content (on Telegram)");
  return renderContent();
}



function GoogleAuthStatus() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/status")
      .then(res => res.json())
      .then(data => {
        setAuthStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error checking auth status:", err);
        setLoading(false);
      });
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Sei sicuro di voler disconnettere l'account Google? Dovrai riautenticarti per vedere gli eventi.")) {
      return;
    }
    
    try {
      const res = await fetch("/api/auth/disconnect", { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        alert("Disconnesso con successo! Ricarica la pagina.");
        window.location.reload();
      } else {
        alert("Errore durante la disconnessione: " + data.error);
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
  };

  if (loading) return null;

  return (
    <div className="mb-4 p-3 border rounded bg-green-50 text-green-800">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold">Google Authentication Status</span>
          {authStatus?.hasTokens ? (
            <div className="text-sm mt-1">
              ✅ Autenticato | 
              Token scade: {authStatus.tokenInfo?.expiryDate ? 
                new Date(authStatus.tokenInfo.expiryDate).toLocaleString() : 
                "Non specificato"
              } |
              Scaduto: {authStatus.tokenInfo?.isExpired ? "Sì (verrà rinnovato auto)" : "No"}
            </div>
          ) : (
            <div className="text-sm mt-1">❌ Non autenticato</div>
          )}
        </div>
        {authStatus?.hasTokens && (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Disconnetti Google
          </button>
        )}
      </div>
    </div>
  );
}

function TelegramBanner({ devMode }: { devMode: boolean }) {
  const { isTelegram, webApp, user } = useTelegramWebApp();
  const [status, setStatus] = useState<string | null>(null);
  const [autoDispatchDone, setAutoDispatchDone] = useState(false);

  useEffect(() => {
    if (isTelegram && webApp?.HapticFeedback) {
      try { webApp.HapticFeedback.selectionChanged(); } catch {}
    }
  }, [isTelegram, webApp]);
  
  // Auto-dispatch silenzioso quando l'app viene aperta da un utente connesso
  useEffect(() => {
    if (!isTelegram || !user?.id || autoDispatchDone) return;
    
    // Fai un dispatch automatico silenzioso in background
    const runAutoDispatch = async () => {
      try {
        const res = await fetch("/api/reminders/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id })
        });
        const data = await res.json();
        console.log("Auto-dispatch eseguito:", data);
        setAutoDispatchDone(true);
        
        // Mostra una notifica discreta se sono stati inviati messaggi
        if (data.ok && data.sent > 0) {
          setStatus(`📬 ${data.sent} promemoria inviati automaticamente`);
          setTimeout(() => setStatus(null), 5000); // Nascondi dopo 5 secondi
        }
      } catch (e) {
        console.error("Auto-dispatch fallito:", e);
        setAutoDispatchDone(true); // Segna come fatto anche in caso di errore per non riprovare
      }
    };
    
    runAutoDispatch();
  }, [isTelegram, user, autoDispatchDone]);

  // Non mostrare il banner in dev mode o se non è Telegram
  if (devMode || !isTelegram) return null;

  const handleGetId = async () => {
    if (!webApp) return;
    setStatus("Ottengo il tuo ID Telegram...");
    
    try {
      const res = await fetch("/api/auth/telegram/get-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: webApp.initData }),
      });
      const data = await res.json();
      
      if (data.ok) {
        setStatus(
          `🆔 ${data.message}\n` +
          `Nome: ${data.userInfo.first_name} ${data.userInfo.last_name || ''}\n` +
          `Username: @${data.userInfo.username || 'N/A'}\n\n` +
          `📝 ${data.instructions}`
        );
      } else {
        setStatus(`Errore nell'ottenere l'ID: ${data.error}`);
      }
    } catch (e: any) {
      setStatus(`Errore di rete: ${e.message}`);
    }
  };

  const handleConnect = async () => {
    if (!webApp) {
      setStatus("❌ WebApp non disponibile");
      return;
    }
    
    if (!webApp.initData) {
      setStatus("❌ initData mancante dalla Mini App");
      console.error("webApp.initData is empty!");
      return;
    }
    
    setStatus("Verifico con Telegram…");
    
    // Log per debug
    console.log("=== Telegram Connection Debug ===");
    console.log("WebApp initData length:", webApp.initData.length);
    console.log("WebApp initDataUnsafe:", webApp.initDataUnsafe);
    console.log("WebApp platform:", webApp.platform);
    
    try {
      // Call debug endpoint first to see what we're sending
      console.log("Calling debug endpoint...");
      const debugRes = await fetch("/api/auth/telegram/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: webApp.initData }),
      });
      
      if (!debugRes.ok) {
        console.error("Debug endpoint failed:", debugRes.status, debugRes.statusText);
      } else {
        const debugData = await debugRes.json();
        console.log("Debug response:", debugData);
      }
      
      // Now try the actual auth
      console.log("Calling auth endpoint...");
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: webApp.initData }),
      });
      
      console.log("Auth response status:", res.status);
      const data = await res.json();
      console.log("Auth response data:", data);
      
      if (!res.ok || !data?.ok) {
        const errorMsg = data?.error ?? res.statusText;
        setStatus(`❌ Errore: ${errorMsg}`);
        console.error("Authentication failed:", errorMsg);
        
        // Show more details if available
        if (data?.warning) {
          setStatus(prev => `${prev}\n⚠️ ${data.warning}`);
        }
      } else {
        setStatus(`✅ Ciao ${data?.user?.first_name || "utente"}! Verifica completata. Avvio dispatcher...`);
        
        // Avvia il dispatcher dopo l'autenticazione riuscita
        try {
          const dispatchRes = await fetch("/api/reminders/dispatch", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user?.id })
          });
          const dispatchData = await dispatchRes.json();
          
          if (dispatchData.ok) {
            setStatus(`✅ Connesso! Dispatcher attivo. Promemoria inviati: ${dispatchData.sent}, saltati: ${dispatchData.skipped}`);
          } else {
            setStatus(`⚠️ Connesso, ma errore nel dispatcher: ${dispatchData.error}`);
          }
        } catch (e: any) {
          console.error("Dispatcher error:", e);
          setStatus(`⚠️ Connesso, ma errore di rete nel dispatcher: ${e.message}`);
        }
      }
    } catch (e: any) {
      console.error("Connection error:", e);
      setStatus(`❌ Errore di rete: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <div className="mb-4 p-3 border rounded bg-blue-50 text-blue-900 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>Mini App Telegram rilevata{user?.first_name ? ` — bentornato, ${user.first_name}` : ""}.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleConnect}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connetti Telegram
        </button>
        <button
          onClick={handleGetId}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Ottieni il mio ID
        </button>
      </div>
      {status && (
        <div className="mt-2 w-full text-sm text-blue-800">{status}</div>
      )}
    </div>
  );
}