"use client";
import { useEffect, useState, useCallback } from "react";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";
import { EventType } from "@/types";

interface UseGoogleEventsResult {
  events: EventType[];
  loading: boolean;
  error: string | null;
  calendarAuthIssue: string | null;
  retry: () => void;
}

export function useGoogleEvents(enabled: boolean): UseGoogleEventsResult {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarAuthIssue, setCalendarAuthIssue] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const { user } = useTelegramWebApp();

  const retry = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setCalendarAuthIssue(null);
          try {
            // Verifica stato Google prima (endpoint aggiornato)
            const statusRes = await fetch(`/api/user/status${user?.id ? `?userId=${user.id}` : ''}`);
            const statusData = await statusRes.json();
            if (!statusRes.ok || !statusData?.hasTokens) {
              const msg = statusData?.error || "Connetti Google Calendar per sincronizzare i tuoi eventi.";
              setCalendarAuthIssue(msg);
              setEvents([]);
              return;
            }
            // Carica eventi (usa l'utente per usare i calendari selezionati lato server)
            const eventsRes = await fetch(`/api/calendar/events${user?.id ? `?userId=${user.id}` : ''}`);
        if (!eventsRes.ok) {
          let msg = "Errore nel recupero degli eventi";
          try {
            const d = await eventsRes.json();
            msg = d?.message || d?.error || msg;
          } catch {}
          setCalendarAuthIssue(msg);
          setEvents([]);
          return;
        }
        const eventsData = await eventsRes.json();
        if (!cancelled) {
          setEvents(eventsData);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Errore sconosciuto nel caricamento eventi');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [enabled, tick, user?.id]);

  return { events, loading, error, calendarAuthIssue, retry };
}
