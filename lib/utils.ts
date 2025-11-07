import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMinutes, formatDistanceToNow, Locale } from "date-fns";
import { it, enUS } from "date-fns/locale";
import type { EventType } from "@/types";

/**
 * Formats a date string into a human-readable format.
 * @param dateString - The ISO date string to format.
 * @param locale - The locale string for formatting (default: 'en-US').
 * @returns The formatted date string.
 */
export function formatDateString(dateString: string, locale: string = 'it-IT'): string {
  const date = new Date(dateString);
  const localesMap: Record<string, Locale> = {
    'en-US': enUS,
    'it-IT': it,
  };
  const selectedLocale = localesMap[locale] || enUS;
  return formatDistanceToNow(date, { locale: selectedLocale });
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte una stringa YYYY-MM-DD in un oggetto Date a mezzanotte ora locale
 */
export function parseLocalDateStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  // new Date(y, m-1, d) crea una data a mezzanotte in timezone locale
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

/**
 * Restituisce la data di inizio dell'evento come Date.
 * Supporta eventi all-day (start.date) e con orario (start.dateTime).
 */
export function getEventStartDate(event: EventType): Date | null {
  const s = event.start
  if (!s) return null
  if (s.dateTime) return new Date(s.dateTime)
  if (s.date) return parseLocalDateStart(s.date)
  return null
}

/**
 * Restituisce la data di fine dell'evento come Date.
 * Per gli all-day in Google Calendar, end.date è esclusivo (giorno successivo):
 * qui restituiamo comunque il valore diretto per la formattazione.
 */
export function getEventEndDate(event: EventType): Date | null {
  const e = event.end
  if (!e) return null
  if (e.dateTime) return new Date(e.dateTime)
  if (e.date) return parseLocalDateStart(e.date)
  return null
}

/**
 * Formatta un offset di promemoria in minuti in italiano, es: "2 ore e 30 min prima".
 */
export function formatReminderOffset(minutes: number): string {
  if (minutes == null || isNaN(minutes)) return ""
  const hrs = Math.floor(minutes / 60)
  const min = minutes % 60
  if (hrs > 0 && min > 0) return `${hrs} ore e ${min} min prima`
  if (hrs > 0 && min === 0) return `${hrs} ore prima`
  return `${minutes} min prima`
}

/**
 * Calcola la data del promemoria (evento.start - minutes) e la formatta come distanza da ora.
 * Esempi: "tra 3 ore", "in 5 minuti", "10 minuti fa".
 */
export function formatReminderETA(event: EventType, minutes: number, opts?: { now?: Date; locale?: Locale }): string {
  const start = getEventStartDate(event)
  if (!start || minutes == null || isNaN(minutes)) return ""
  const reminderAt = addMinutes(start, -minutes)
  return formatDistanceToNow(reminderAt, {
    addSuffix: true,
    locale: opts?.locale ?? it,
    includeSeconds: false,
  })
}

/**
 * Restituisce oggetto utile per UI dei reminder
 */
export function getReminderInfo(event: EventType, minutes: number) {
  const start = getEventStartDate(event)
  if (!start || minutes == null || isNaN(minutes)) return null
  const when = addMinutes(start, -minutes)
  const eta = formatDistanceToNow(when, { addSuffix: true, locale: it })
  return { when, eta }
}

export interface UpcomingReminder {
  eventId: string
  title: string
  description?: string
  htmlLink?: string
  method?: 'email' | 'popup' | null
  minutes: number
  when: Date
  eta: string
  eventStart?: Date | null
}

/**
 * Ritorna tutti i prossimi promemoria futuri per la lista di eventi, ordinati per scadenza.
 * Per default limita all'orizzonte dei prossimi 30 giorni.
 */
export function getUpcomingReminders(
  events: EventType[],
  opts?: { now?: Date; maxDays?: number; locale?: Locale }
): UpcomingReminder[] {
  const now = opts?.now ?? new Date()
  const horizonMs = (opts?.maxDays ?? 30) * 24 * 60 * 60 * 1000
  const maxDate = new Date(now.getTime() + horizonMs)
  const locale = opts?.locale ?? it

  const items: UpcomingReminder[] = []

  for (const ev of events) {
    const start = getEventStartDate(ev)
    if (!start) continue
    if (!ev.effectiveReminders || ev.effectiveReminders.length === 0) continue

    for (const r of ev.effectiveReminders) {
      const minutes = r.minutes ?? undefined
      if (minutes == null || isNaN(minutes)) continue
      const when = addMinutes(start, -minutes)
      if (when <= now || when > maxDate) continue
      items.push({
        eventId: ev.id,
        title: ev.summary,
        description: ev.description,
        htmlLink: ev.htmlLink,
        method: r.method ?? null,
        minutes,
        when,
        eta: formatDistanceToNow(when, { addSuffix: true, locale }),
        eventStart: start,
      })
    }
  }

  items.sort((a, b) => a.when.getTime() - b.when.getTime())
  return items
}
