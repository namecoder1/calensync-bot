"use client"

import { UpcomingReminder, getUpcomingReminders, getEventStartDate } from "@/lib/utils"
import type { EventType } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PiClockCountdownFill } from "react-icons/pi";
import Link from "next/link"
import { format, addMinutes, startOfDay, endOfDay } from "date-fns"
import { it } from "date-fns/locale"
import SafeHtml from "@/components/ui/safe-html"
import { SiGooglemeet, SiGooglecalendar } from "react-icons/si";

const mapCalendarsColor = (calendar: string) => {
  switch (calendar) {
    case 'Generale': return 'bg-green-600';
    case 'RdB': return 'bg-orange-600';
    case 'RdC': return 'bg-blue-500';
    default: return 'bg-gray-400';
  }
}

// Calcola i promemoria di oggi (inviati e da inviare)
function getTodayReminders(events: EventType[]) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  
  const todayReminders: Array<{ eventId: string; minutes: number; when: Date; isSent: boolean }> = []
  
  for (const ev of events) {
    const start = getEventStartDate(ev)
    if (!start) continue
    const reminders = ev.effectiveReminders || []
    for (const r of reminders) {
      const minutes = r.minutes ?? null
      if (minutes == null || isNaN(minutes)) continue
      const when = addMinutes(start, -minutes)
      if (when >= todayStart && when <= todayEnd) {
        // Un promemoria è "già inviato" se la sua ora di invio è nel passato
        const isSent = when < now
        todayReminders.push({ eventId: ev.id, minutes, when, isSent })
      }
    }
  }
  
  return todayReminders
}

export default function RemindersList({ events }: { events: EventType[] }) {
  const reminders: UpcomingReminder[] = getUpcomingReminders(events)
  const todayReminders = getTodayReminders(events)
  const todaySentCount = todayReminders.filter(r => r.isSent).length
  const todayToSendCount = todayReminders.filter(r => !r.isSent).length

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prossimi promemoria</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Nessun promemoria in arrivo entro 30 giorni.</CardContent>
      </Card>
    )
  }

  return (
    <section>
      <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Generale</p>
          <p className="text-2xl font-semibold">{events.filter(event => event.sourceCalendarSummary === 'Generale').length}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">RdB</p>
          <p className="text-2xl font-semibold">{events.filter(event => event.sourceCalendarSummary === 'RdB').length}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">RdC</p>
          <p className="text-2xl font-semibold">{events.filter(event => event.sourceCalendarSummary === 'RdC').length}</p>
        </div>
        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
          <p className="text-xs text-muted-foreground mb-1">Inviati oggi</p>
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{todaySentCount}</p>
        </div>
        <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
          <p className="text-xs text-muted-foreground mb-1">Da inviare oggi</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{todayToSendCount}</p>
        </div>
      </div>
      <div className="mt-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-6">Prossimi promemoria</h2>
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {reminders.map((r, idx) => (
            <Card key={`${r.eventId}-${r.minutes}-${idx}`} className="flex items-start py-4">
              <CardHeader className="w-full h-full px-4">
                <CardTitle className="flex items-center justify-between w-full">
                  <span className="leading-relaxed">{r.title}</span>
                  <span className="text-xs border px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <div className={`h-2 w-2  rounded-xs ${mapCalendarsColor(events.find(reminder => reminder.id === r.eventId)?.sourceCalendarSummary || '')}`} />
                    {events.find(reminder => reminder.id === r.eventId)?.sourceCalendarSummary}
                  </span>
                </CardTitle>
                {r.description && (
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    <SafeHtml html={r.description} />
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="min-w-0 flex-1 px-4 w-full">
                <div className="grid grid-cols-3 items-center gap-2 w-full">
                  <div className="border p-3 rounded-lg">
                    {events.find(reminder => reminder.id === r.eventId)?.hangoutLink ? (
                      <Link href={events.find(reminder => reminder.id === r.eventId)?.hangoutLink as string} target="_blank" className="flex flex-col items-center gap-1.5">
                        <SiGooglemeet size={20} />
                        <span className="text-sm text-muted-foreground">Meet Link</span>
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">No Meet Link</span>
                    )}
                  </div>
                  <div className="border p-3 rounded-lg">
                    <Link href={events.find(reminder => reminder.id === r.eventId)?.htmlLink || "#"} target="_blank" className="flex flex-col items-center gap-1.5">
                      <SiGooglecalendar size={20} />
                      <span className="text-sm text-muted-foreground">View Event</span>
                    </Link>
                  </div>
                  <div className="border p-3 rounded-lg w-full">
                    <div className="flex flex-col items-center gap-1">
                      <PiClockCountdownFill color="black" size={20} />
                      <span className="text-muted-foreground text-xs 3xl:text-sm text-center">{format(r.when, 'd/MM/yyyy HH:mm', { locale: it })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
