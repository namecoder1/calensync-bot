import { EventType } from '@/types'
import { format as formatDate } from 'date-fns'
import { it } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ArrowRight, Pin, AlarmClock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getReminderInfo, getEventStartDate, getEventEndDate } from '@/lib/utils'
import SafeHtml from '@/components/ui/safe-html'

const Event = ({
	event
}: {
	event: EventType
}) => {
	const startDate = getEventStartDate(event)
	const endDate = getEventEndDate(event)
	const isAllDay = !!event.start?.date && !event.start?.dateTime

	const locationText = event.location || ''
	const maxLen = 60
	const isTruncated = locationText.length > maxLen
	const locationShort = isTruncated ? locationText.slice(0, maxLen) + '…' : locationText

	return (
		<Card>
			<CardHeader className="space-y-2">
				<CardTitle className="text-base md:text-lg font-semibold">
					<h3 className="line-clamp-2">{event.summary}</h3>
					<p>Calendario: {event.sourceCalendarSummary}</p>
				</CardTitle>
				{/* Riepilogo data/orario */}
				{(startDate || endDate) && (
					<div className="text-sm text-muted-foreground flex items-center gap-2">
						{isAllDay && startDate && !event.end?.dateTime ? (
							<div className="capitalize">
								{event.end?.date && event.start?.date && event.end.date !== event.start.date ? (
									<div className='flex items-center gap-2'>
										{formatDate(startDate, 'd MMM', { locale: it })}
										<ArrowRight size={14} className="mx-1" />
										{formatDate(endDate!, 'd MMM', { locale: it })}
									</div>
								) : (
									<>Tutto il giorno: {formatDate(startDate, 'd MMM', { locale: it })}</>
								)}
							</div>
						) : (
							startDate && endDate && (
								<div className='flex items-center gap-2'>
									<p className='capitalize'>{formatDate(startDate, 'd MMM HH:mm', { locale: it })}</p>
									<ArrowRight size={14} />
									<p className='capitalize'>{formatDate(endDate, 'd MMM HH:mm', { locale: it })}</p>
								</div>
							)
						)}
					</div>
				)}
				{event.description && (
					<CardDescription className="line-clamp-3">
						<SafeHtml html={event.description} />
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Luogo */}
				{event.location && (
					<Link
						href={`https://www.google.com/search?q=${encodeURIComponent(event.location)}`}
						target='_blank'
						className='flex items-start gap-2 text-sm hover:underline'
					>
						<Pin size={16} className='mt-0.5 text-muted-foreground' />
						<span className="line-clamp-1" title={event.location}>{locationShort}</span>
					</Link>
				)}

				{/* Reminders */}
				{event.effectiveReminders && event.effectiveReminders.length > 0 && (
					<div className="space-y-1">
						<div className="text-xs font-medium text-muted-foreground">Promemoria</div>
						<div className="flex flex-wrap gap-2">
							{event.effectiveReminders.map((reminder, idx) => {
								const minutes = reminder.minutes ?? undefined
								if (minutes == null) return null
								const info = getReminderInfo(event, minutes)
								if (!info) return null
								return (
									<span
										key={idx}
										className='inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 text-xs text-foreground'
										title={formatDate(info.when, 'EEE d MMM yyyy HH:mm', { locale: it })}
									>
										<AlarmClock size={14} className="text-muted-foreground" />
										<span className="font-medium">{reminder.method ?? 'promemoria'}</span>
										<span className="text-muted-foreground">• {formatDate(info.when, 'EEE d MMM yyyy HH:mm', { locale: it })}</span>
									</span>
								)
							})}
						</div>
					</div>
				)}

				{/* Partecipanti */}
				{event.attendees && event.attendees.length > 0 && (
					<div className="space-y-1">
						<div className="text-xs font-medium text-muted-foreground">Partecipanti ({event.attendees.length})</div>
						<ul className="list-disc list-inside text-sm space-y-0.5">
							{event.attendees.map((attendee) => (
								<li key={attendee.email} className="truncate">
									{attendee.email} {attendee.organizer ? "(organizzatore)" : ""}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Link azioni */}
				{(event.hangoutLink || event.htmlLink) && (
					<>
						<Separator />
						<div className='flex flex-wrap gap-2'>
							{event.hangoutLink && (
								<Button asChild size="sm" variant="outline">
									<Link href={event.hangoutLink} target="_blank">
										<ExternalLink className="size-4" />
										Apri link riunione
									</Link>
								</Button>
							)}
							{event.htmlLink && (
								<Button asChild size="sm" variant="ghost">
									<Link href={event.htmlLink} target="_blank">
										<ExternalLink className="size-4" />
										Apri in Google Calendar
									</Link>
								</Button>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

export default Event