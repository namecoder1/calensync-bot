"use client"

import { useEffect, useMemo, useState } from "react"
import { useGoogleEvents } from "@/lib/useGoogleEvents";
import { FaGoogle, FaTelegramPlane } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { TbReload } from "react-icons/tb";
import { TailSpin } from "react-loader-spinner";
import RemindersList from "@/components/blocks/reminders-list";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { GrSend } from "react-icons/gr";
import { QRCodeCanvas } from 'qrcode.react';
import Link from "next/link";
import { Footer } from "@/components/footer";
import { toast } from "sonner";


type Phase =
  | 'WEB_QR'
  | 'TG_AUTH_PROGRESS'
  | 'TG_FIRST_RUN_GOOGLE_CONNECT'
  | 'TG_FIRST_RUN_SELECT_CALENDARS'
  | 'TG_FIRST_RUN_SELECT_GROUPS'
  | 'TG_FIRST_RUN_MAPPING'
  | 'TG_APP_READY'

export default function EventsPage() {
  const router = useRouter()
  const { user, isTelegram, webApp, devMode: telegramDevMode, sdkTimeoutExceeded } = useTelegramWebApp()

  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('WEB_QR')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null)
  const [telegramAuthDone, setTelegramAuthDone] = useState(false)
  // Gruppi Telegram dinamici
  const [groups, setGroups] = useState<Array<{ chat_id: string; title: string; type: string; topics: Array<{ id: number; title: string }> }>>([])
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({}) // chat_id#topicId? -> selected
  const [registeringGroups, setRegisteringGroups] = useState(false)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  // Mapping state
  const [mapCalendars, setMapCalendars] = useState<Array<{ id: string; calendar_id: string; calendar_name: string }>>([])
  const [mapSelections, setMapSelections] = useState<Record<string, string>>({}) // key by calendarId -> value "chatId" or "chatId#topicId"
  const [mappingLoading, setMappingLoading] = useState(false)
  const [mappingError, setMappingError] = useState<string | null>(null)
  // Calendari selezione
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string; primary?: boolean; accessRole?: string }>>([])
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState<string | null>(null)
  const [selectedCalendars, setSelectedCalendars] = useState<Record<string, boolean>>({})

  // Dev: consenti forzare la fase
  const devEnabled = useMemo(() => process.env.NODE_ENV === 'development' || telegramDevMode, [telegramDevMode])
  const [manualPhase, setManualPhase] = useState<Phase | null>(null)

  // Eventi Google (solo per fase operativa)
  const { events, loading: eventsLoading, error: eventsError, calendarAuthIssue, retry: retryEvents } = useGoogleEvents(isAuthorized)

  useEffect(() => setMounted(true), [])

  // Impostazione fase base in base al contesto (web vs Telegram)
  // Decide la fase dall'oggetto status utente
  const decidePhaseFromStatus = (status: any) => {
    if (!status) {
      setPhase('TG_FIRST_RUN_GOOGLE_CONNECT')
      return
    }
    if (!status.google_connected) {
      setPhase('TG_FIRST_RUN_GOOGLE_CONNECT')
      return
    }
    if (status.google_connected && !status.onboarding_completed) {
      setPhase('TG_FIRST_RUN_SELECT_CALENDARS') // prossimo step logico
      return
    }
    if (status.google_connected && status.onboarding_completed) {
  toast.success('Mappature salvate, onboarding completato!')
  setPhase('TG_APP_READY')
      return
    }
    // fallback
    setPhase('TG_FIRST_RUN_GOOGLE_CONNECT')
  }

  // Primo effect: gestisce auth Telegram e fase iniziale grossolana
  useEffect(() => {
    if (!mounted) return

    if (!isTelegram) {
      setPhase('WEB_QR')
      setIsAuthorized(false)
      return
    }

    if (!webApp && !telegramDevMode && !sdkTimeoutExceeded) {
      setPhase('TG_AUTH_PROGRESS')
      return
    }

    if (sdkTimeoutExceeded) {
      setPhase('TG_AUTH_PROGRESS')
      return
    }

    const doAuth = async () => {
      if (telegramAuthDone) return
      try {
        const already = typeof window !== 'undefined' && sessionStorage.getItem('tgAuthDone') === '1'
        if (!already && webApp?.initData) {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: webApp.initData })
          })
          let data: any = null
          try { data = await res.json() } catch {}
          if (!res.ok || !data?.ok) {
            console.warn('Telegram auth failed', data?.error || res.statusText)
            setTelegramAuthError(data?.error || res.statusText || 'Telegram authentication failed')
          }
          if (data?.warning) setTelegramAuthError((prev) => prev ?? data.warning)
        }
      } catch (e: any) {
        console.warn('Telegram auth error', e)
        setTelegramAuthError(e?.message || 'Network error during Telegram auth')
      } finally {
        if (typeof window !== 'undefined') sessionStorage.setItem('tgAuthDone', '1')
        setTelegramAuthDone(true)
        setIsAuthorized(true)
      }
    }
    doAuth()
  }, [mounted, isTelegram, webApp, telegramDevMode, sdkTimeoutExceeded, telegramAuthDone, user?.id])

  // Secondo effect: una volta autenticato Telegram e disponibile user.id, interroga /api/user/status
  useEffect(() => {
    const run = async () => {
      if (!telegramAuthDone || !user?.id || !isTelegram) return
      try {
        const res = await fetch(`/api/user/status?userId=${user.id}`)
        let data: any = null
        try { data = await res.json() } catch {}
        if (!res.ok) throw new Error(data?.error || 'Status error')
        decidePhaseFromStatus(data)
      } catch (e) {
        console.warn('User status fetch failed', e)
        decidePhaseFromStatus(null)
      }
    }
    run()
  }, [telegramAuthDone, user?.id, isTelegram])

  // Azioni operative
  const triggerDispatch = async () => {
    if (!user) return
    const confirmed = confirm(
      "Questo invierà TUTTI i promemoria di OGGI (passati e futuri).\n\n" +
      "I promemoria già inviati verranno saltati automaticamente.\n\n" +
      "Vuoi continuare?"
    )
    if (!confirmed) return
    try {
      const res = await fetch('/api/reminders/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await res.json()
      if (data.ok) {
        const message =
          `✅ Dispatch Manuale Completato!\n\n` +
          `📤 Messaggi inviati: ${data.sent || 0}\n` +
          `⏭️ Saltati (già inviati): ${data.skipped || 0}\n` +
          `📊 Totale trovati: ${data.totalDue || 0}\n` +
          `${data.errors?.length ? `\n⚠️ Errori: ${data.errors.length}` : ''}`
        alert(message)
      } else {
        alert(`❌ Errore nel dispatch:\n${data.error || 'Errore sconosciuto'}`)
      }
    } catch (e: any) {
      alert('❌ Errore di rete: ' + e.message)
    }
  }

  const handleReload = () => {
    if (!user) return
    window.location.reload()
  }

  // Dev panel per mockare la fase
  const effectivePhase = manualPhase ?? phase

  // Fetch gruppi quando entriamo nella fase selezione gruppi (o refresh manuale)
  useEffect(() => {
    const load = async () => {
      if ((manualPhase ?? phase) !== 'TG_FIRST_RUN_SELECT_GROUPS') return
      if (!user?.id) return
      setGroupsLoading(true)
      setGroupsError(null)
      try {
        const res = await fetch(`/api/telegram/groups?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'Errore caricamento gruppi')
        setGroups(data.groups || [])
      } catch (e: any) {
        setGroupsError(e.message || 'Errore sconosciuto')
      } finally {
        setGroupsLoading(false)
      }
    }
    load()
  }, [manualPhase, phase, user?.id])

  const refreshGroups = async () => {
    if (!user?.id) return
    setGroupsLoading(true)
    setGroupsError(null)
    try {
      const res = await fetch(`/api/telegram/groups?userId=${user.id}`)
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Errore caricamento gruppi')
      setGroups(data.groups || [])
    } catch (e: any) {
      setGroupsError(e.message || 'Errore sconosciuto')
    } finally {
      setGroupsLoading(false)
    }
  }

  const deregisterGroup = async (chatId: string) => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/telegram/groups/deregister', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, chatId })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Errore deregistrazione gruppo')
      toast.success('Gruppo deregistrato')
      await refreshGroups()
    } catch (e: any) {
      toast.error(e.message || 'Errore deregistrazione gruppo')
    }
  }

  const deregisterTopic = async (chatId: string, topicId: number) => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/telegram/groups/deregister', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, items: [{ chatId, topicId }] })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Errore deregistrazione topic')
      toast.success('Topic deregistrato')
      await refreshGroups()
    } catch (e: any) {
      toast.error(e.message || 'Errore deregistrazione topic')
    }
  }

  const toggleGroupSelected = (key: string) => {
    setSelectedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const registerSelectedGroups = async () => {
    if (!user?.id) return
    const items = [] as Array<{ chatId: string; title?: string; type?: string; topics?: Array<{ id: number; title?: string }> }>
    // Per ogni group scegliamo se includere tutto il gruppo (se selezionato il base) e ogni topic selezionato
    for (const g of groups) {
      const baseKey = `${g.chat_id}#`
      const baseSelected = selectedGroups[baseKey]
      const topicItems = g.topics.filter(t => selectedGroups[`${g.chat_id}#${t.id}`]).map(t => ({ id: t.id, title: t.title }))
      if (baseSelected || topicItems.length > 0) {
        items.push({ chatId: g.chat_id, title: g.title, type: g.type, topics: topicItems })
      }
    }
    if (items.length === 0) {
      alert('Seleziona almeno un gruppo o topic prima di salvare.')
      return
    }
    setRegisteringGroups(true)
    try {
      const res = await fetch('/api/telegram/groups/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, items, replace: true })
      })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || 'Errore registrazione gruppi')
  toast.success('Gruppi selezionati salvati')
  // Dopo registrazione, ricarica elenco e passa alla fase mapping
      await refreshGroups()
      setPhase('TG_FIRST_RUN_MAPPING')
    } catch (e: any) {
      alert(e.message || 'Errore sconosciuto durante registrazione gruppi')
    } finally {
      setRegisteringGroups(false)
    }
  }

  // Fetch dati per mapping quando entriamo nella fase
  useEffect(() => {
    const load = async () => {
      if ((manualPhase ?? phase) !== 'TG_FIRST_RUN_MAPPING') return
      if (!user?.id) return
      setMappingLoading(true)
      setMappingError(null)
      try {
        // Carica calendari abilitati
        const [calRes, grpRes, mapRes] = await Promise.all([
          fetch(`/api/user/calendars?userId=${user.id}`),
          groups.length ? Promise.resolve({ ok: true, json: async () => ({ ok: true, groups }) }) : fetch(`/api/telegram/groups?userId=${user.id}`),
          fetch(`/api/mappings?userId=${user.id}`),
        ])
        const calData = await calRes.json();
        if (!calRes.ok || !calData.ok) throw new Error(calData.error || 'Errore caricamento calendari')
        setMapCalendars((calData.calendars || []).map((c: any) => ({ id: c.id, calendar_id: c.calendar_id, calendar_name: c.calendar_name })))

        let groupsData: any = null;
        if ('ok' in (grpRes as any) && (grpRes as any).ok === true) {
          groupsData = await (grpRes as any).json();
        } else {
          groupsData = await (grpRes as Response).json();
        }
        if (!groups.length) {
          if (!(('ok' in groupsData) && groupsData.ok)) throw new Error(groupsData.error || 'Errore gruppi')
          setGroups(groupsData.groups || [])
        }

        const mapData = await mapRes.json();
        if (!mapRes.ok || !mapData.ok) throw new Error(mapData.error || 'Errore mappature')
        // Precompila selezioni
        const sel: Record<string, string> = {}
        for (const m of mapData.mappings || []) {
          const key = m.calendarId
          const value = m.topicId != null ? `${m.chatId}#${m.topicId}` : `${m.chatId}`
          sel[key] = value
        }
        setMapSelections(sel)
      } catch (e: any) {
        setMappingError(e.message || 'Errore sconosciuto')
      } finally {
        setMappingLoading(false)
      }
    }
    load()
  }, [manualPhase, phase, user?.id, groups.length])

  // Fetch calendari reali quando entriamo nella fase di selezione calendari
  useEffect(() => {
    const load = async () => {
      if ((manualPhase ?? phase) !== 'TG_FIRST_RUN_SELECT_CALENDARS') return
      if (!user?.id) return
      setCalLoading(true)
      setCalError(null)
      try {
        const res = await fetch(`/api/google/calendars?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'Errore caricamento calendari')
        const list = (data.calendars || []) as Array<{ id: string; summary: string; primary?: boolean; accessRole?: string }>
        // Filtra solo calendari con accesso reader/editor/owner
        const filtered = list.filter(c => (c.accessRole || '').toLowerCase() !== 'freebusy')
        setCalendars(filtered)
        // Preseleziona il primary se presente
        const defaults: Record<string, boolean> = {}
        for (const c of filtered) {
          if (c.primary) defaults[c.id] = true
        }
        setSelectedCalendars(defaults)
      } catch (e: any) {
        setCalError(e.message || 'Errore sconosciuto')
      } finally {
        setCalLoading(false)
      }
    }
    load()
  }, [manualPhase, phase, user?.id])

  const toggleCalendar = (id: string) => {
    setSelectedCalendars(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const saveCalendars = async () => {
    if (!user?.id) return
    const items = calendars.filter(c => selectedCalendars[c.id]).map(c => ({ calendarId: c.id, calendarName: c.summary }))
    if (items.length === 0) {
      toast.warning('Seleziona almeno un calendario')
      return
    }
    try {
      const res = await fetch('/api/user/calendars/selection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, items })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Errore salvataggio selezione')
      toast.success('Calendari salvati')
      setPhase('TG_FIRST_RUN_SELECT_GROUPS')
    } catch (e: any) {
      toast.error(e.message || 'Errore salvataggio calendari')
    }
  }

  const saveMappings = async () => {
    if (!user?.id) return
    setMappingLoading(true)
    setMappingError(null)
    try {
      const mappings = Object.entries(mapSelections)
        .filter(([calId, v]) => !!v)
        .map(([calendarId, v]) => {
          const [chatId, topicStr] = v.split('#')
          const topicId = topicStr ? parseInt(topicStr, 10) : undefined
          return { calendarId, chatId, topicId }
        })
      const res = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, mappings })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Errore salvataggio mappature')

      // Segna onboarding completo
      const done = await fetch('/api/user/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, completed: true })
      })
      const djson = await done.json().catch(() => ({}))
      if (!done.ok || !djson.ok) throw new Error(djson.error || 'Errore completamento onboarding')

      setPhase('TG_APP_READY')
    } catch (e: any) {
      setMappingError(e.message || 'Errore sconosciuto')
    } finally {
      setMappingLoading(false)
    }
  }

  const renderPhase = (p: Phase) => {
    switch (p) {
      case 'WEB_QR':
        return (
          <div className="max-w-sm mx-auto px-4 text-center flex flex-col items-center justify-center min-h-screen">
            <h1 className="font-bold text-3xl tracking-tight">Login with Telegram</h1>
            <p className="mt-2 text-muted-foreground mb-10">Scan the QR code below to open the bot on Telegram:</p>
            <div className="border p-2 rounded-2xl">
              <QRCodeCanvas value='https://web.telegram.org/k/#@calensyncbot' size={256} bgColor="#ffffff" level="Q" className="m-2" />
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
              <Button asChild>
                <Link href="https://web.telegram.org/k/#@calensyncbot">
                  <FaTelegramPlane />
                  Open on Telegram
                </Link>
              </Button>
            </div>
          </div>
        )

      case 'TG_AUTH_PROGRESS':
        return (
          <div className="p-6 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <TailSpin visible={true} height="80" width="80" color="#1ca34d" ariaLabel="tail-spin-loading" radius="1" wrapperClass="mx-auto w-fit mb-4" />
              <p className="text-muted-foreground">{sdkTimeoutExceeded ? "Impossibile inizializzare Telegram. Chiudi e riapri la Mini App." : "Connessione a Telegram..."}</p>
            </div>
          </div>
        )

      case 'TG_FIRST_RUN_GOOGLE_CONNECT':
        return (
          <div className="p-6 min-h-screen flex flex-col items-center justify-center">
            {telegramAuthError && (
              <div className="max-w-sm w-full mb-4"><Alert variant="warning">{telegramAuthError}</Alert></div>
            )}
            <div className="flex flex-col items-center justify-center mb-8 max-w-sm text-center">
              <div className="bg-blue-100 p-3 mb-4 rounded-xl border border-blue-300">
                <FaGoogle size={32} className="mx-auto" color="#4285f4" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Connetti Google Calendar</h1>
              <p className="text-muted-foreground mb-6">Collega il tuo account Google per iniziare l'onboarding.</p>
              <Button onClick={() => router.push(`/api/auth/google?userId=${user?.id || ''}`)} size="lg" className="w-full" disabled={!user?.id}>
                <FaGoogle />
                Connetti Google
              </Button>
              <div className="mt-6">
                <Button variant="outline" onClick={() => setPhase('TG_FIRST_RUN_SELECT_CALENDARS')}>Ho già connesso — Continua</Button>
              </div>
            </div>
          </div>
        )

      case 'TG_FIRST_RUN_SELECT_CALENDARS':
        return (
          <div className="p-6 min-h-screen max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Seleziona i calendari</h1>
            <p className="text-muted-foreground mb-4">Scegli i calendari da cui ricevere promemoria.</p>
            <div className="rounded border p-4 mb-4">
              {calLoading && <Alert variant="info">Caricamento calendari...</Alert>}
              {calError && <Alert variant="error">{calError}</Alert>}
              {!calLoading && !calError && calendars.length === 0 && (
                <Alert variant="warning">Nessun calendario disponibile. Assicurati di aver concesso i permessi.</Alert>
              )}
              {!calLoading && !calError && calendars.length > 0 && (
                <ul className="space-y-2">
                  {calendars.map(c => (
                    <li key={c.id} className="border rounded p-2 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-green-600" checked={!!selectedCalendars[c.id]} onChange={() => toggleCalendar(c.id)} />
                        <span className="font-medium">{c.summary}</span>
                      </label>
                      {c.primary && <span className="text-xs px-2 py-0.5 rounded bg-muted">Primary</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase('TG_FIRST_RUN_GOOGLE_CONNECT')}>Indietro</Button>
              <Button onClick={saveCalendars} disabled={calLoading || calendars.length === 0}>Continua</Button>
            </div>
          </div>
        )

      case 'TG_FIRST_RUN_SELECT_GROUPS':
        return (
          <div className="p-6 min-h-screen max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-3">Aggiungi e seleziona gruppi</h1>
            <div className="space-y-3 mb-4 text-sm">
              <Alert variant="info">
                <div className="space-y-2">
                  <p><strong>1.</strong> Apri ogni gruppo / supergruppo in cui vuoi ricevere i promemoria e <strong>aggiungi il bot</strong> (<code>@calensyncbot</code>).</p>
                  <p><strong>2.</strong> (Facoltativo) Crea o apri i topic nel gruppo.</p>
                  <p><strong>3.</strong> Torna qui e premi <strong>"Refresh gruppi"</strong> per vedere quelli già registrati (il bot li apprende quando riceve messaggi / viene aggiunto).</p>
                  <p><strong>4.</strong> Seleziona i gruppi (e topic) da usare poi nel mapping.</p>
                </div>
              </Alert>
            </div>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" onClick={() => setPhase('TG_FIRST_RUN_SELECT_CALENDARS')}>Indietro</Button>
              <Button variant="secondary" onClick={refreshGroups} disabled={groupsLoading}>
                <TbReload />
                Refresh gruppi
              </Button>
            </div>
            <div className="rounded border p-4 mb-6">
              {groupsLoading && <Alert variant="info">Caricamento gruppi...</Alert>}
              {groupsError && <Alert variant="error">{groupsError}</Alert>}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <p className="text-sm text-muted-foreground">Nessun gruppo ancora visibile. Assicurati di aver aggiunto il bot ai gruppi e di aver inviato almeno un messaggio.</p>
              )}
              {!groupsLoading && !groupsError && groups.length > 0 && (
                <ul className="mt-2 space-y-4">
                  {groups.map(g => {
                    const baseKey = `${g.chat_id}#`
                    return (
                      <li key={g.chat_id} className="border rounded p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-green-600"
                                checked={!!selectedGroups[baseKey]}
                                onChange={() => toggleGroupSelected(baseKey)}
                              />
                              {g.title}
                            </label>
                            <div className="text-xs text-muted-foreground mt-1">{g.type}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">chat id: {g.chat_id}</div>
                            <Button size="sm" variant="outline" onClick={() => deregisterGroup(g.chat_id)}>Deregistra</Button>
                          </div>
                        </div>
                        {g.topics?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs mb-2 font-semibold">Topic disponibili</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {g.topics.map(t => {
                                const topicKey = `${g.chat_id}#${t.id}`
                                return (
                                  <label key={topicKey} className="flex items-center gap-2 text-xs cursor-pointer border rounded p-2">
                                    <input
                                      type="checkbox"
                                      className="accent-green-600"
                                      checked={!!selectedGroups[topicKey]}
                                      onChange={() => toggleGroupSelected(topicKey)}
                                    />
                                    <span className="truncate" title={t.title}>{t.title}</span>
                                    <span className="text-muted-foreground">({t.id})</span>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deregisterTopic(g.chat_id, t.id) }}>Deregistra</Button>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={registerSelectedGroups} disabled={registeringGroups || groupsLoading}>Salva selezione</Button>
              <Button variant="outline" onClick={() => setPhase('TG_FIRST_RUN_MAPPING')} disabled={registeringGroups || Object.keys(selectedGroups).length === 0}>Vai al mapping</Button>
            </div>
          </div>
        )

      case 'TG_FIRST_RUN_MAPPING':
        return (
          <div className="p-6 min-h-screen max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Mappa Calendari → Gruppi/Topic</h1>
            <p className="text-muted-foreground mb-4">Abbina ogni calendario a un gruppo o topic.</p>
            {mappingError && <div className="mb-3"><Alert variant="error">{mappingError}</Alert></div>}
            <div className="grid gap-3 rounded border p-4 mb-4">
              {mappingLoading && (<Alert variant="info">Caricamento dati...</Alert>)}
              {!mappingLoading && mapCalendars.length === 0 && (
                <Alert variant="warning">Nessun calendario selezionato. Torna indietro e seleziona almeno un calendario.</Alert>
              )}
              {!mappingLoading && mapCalendars.map((c) => (
                <div key={c.calendar_id} className="flex items-center justify-between gap-4">
                  <span className="truncate max-w-[40%]" title={c.calendar_name}>{c.calendar_name}</span>
                  <select
                    className="border rounded p-2 text-sm flex-1"
                    value={mapSelections[c.calendar_id] || ''}
                    onChange={(e) => setMapSelections((prev) => ({ ...prev, [c.calendar_id]: e.target.value }))}
                  >
                    <option value="">— Seleziona destinazione —</option>
                    {groups.map((g) => (
                      <optgroup key={g.chat_id} label={g.title}>
                        <option value={`${g.chat_id}`}>Intero gruppo</option>
                        {g.topics?.map((t) => (
                          <option key={`${g.chat_id}#${t.id}`} value={`${g.chat_id}#${t.id}`}>{t.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase('TG_FIRST_RUN_SELECT_GROUPS')} disabled={mappingLoading}>Modifica selezione gruppi</Button>
              <Button onClick={saveMappings} disabled={mappingLoading || mapCalendars.length === 0}>Conferma e continua</Button>
            </div>
          </div>
        )

      case 'TG_APP_READY':
        return (
          <div>
            {telegramAuthError && (
              <div className="px-4 pt-4"><Alert variant="warning">{telegramAuthError}</Alert></div>
            )}
            {user && (
              <section className="px-4 py-2">
                <h2 className="font-semibold">Connessione con Telegram</h2>
                <p>Sei connesso come: <strong>{user.username || user.id}</strong></p>
              </section>
            )}
            <section>
              <nav className="p-4 border-b border-border mb-6 flex items-center justify-between">
                <h1 className="font-bold text-2xl tracking-tight flex items-center">Dashboard</h1>
                <div className="flex gap-2 flex-wrap">
                  <Button variant='outline' onClick={handleReload}>
                    <TbReload />
                    <span className="hidden sm:block">Reload</span>
                  </Button>
                  <Button disabled={!user} onClick={triggerDispatch}>
                    <GrSend />
                    <span className="hidden sm:block">Manual send</span>
                  </Button>
                </div>
              </nav>
              <div className="px-4">
                {eventsLoading && (<div className="mb-4"><Alert variant="info">Caricamento eventi...</Alert></div>)}
                {eventsError && (<div className="mb-4"><Alert variant="error">{eventsError}</Alert></div>)}
                {!eventsLoading && events.length === 0 && !eventsError && (
                  <div className="mb-4"><Alert variant="info">Nessun evento imminente trovato.</Alert></div>
                )}
                <RemindersList events={events} />
              </div>
            </section>
            <Footer />
          </div>
        )
    }
  }

  return (
    <div>
      {renderPhase(effectivePhase)}
      {devEnabled && (
        <div className="fixed bottom-3 right-3 bg-card border rounded-lg shadow-lg p-3 text-sm space-y-2 z-50">
          <div className="font-semibold">Dev Panel</div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Phase</label>
            <select
              className="border rounded p-1"
              value={manualPhase ?? phase}
              onChange={(e) => setManualPhase(e.target.value as Phase)}
            >
              <option value="WEB_QR">WEB_QR</option>
              <option value="TG_AUTH_PROGRESS">TG_AUTH_PROGRESS</option>
              <option value="TG_FIRST_RUN_GOOGLE_CONNECT">TG_FIRST_RUN_GOOGLE_CONNECT</option>
              <option value="TG_FIRST_RUN_SELECT_CALENDARS">TG_FIRST_RUN_SELECT_CALENDARS</option>
              <option value="TG_FIRST_RUN_SELECT_GROUPS">TG_FIRST_RUN_SELECT_GROUPS</option>
              <option value="TG_FIRST_RUN_MAPPING">TG_FIRST_RUN_MAPPING</option>
              <option value="TG_APP_READY">TG_APP_READY</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => setManualPhase(null)}>Auto</Button>
          </div>
        </div>
      )}
    </div>
  )
}



// (Rimossi componenti legacy: GoogleAuthStatus, TelegramBanner)