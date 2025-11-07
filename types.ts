interface CalendarUserType {
	email: string;
	self: boolean;	
}

interface AttendeeType extends CalendarUserType {
	responseStatus: string;
	organizer?: boolean;
}

interface EventStartEndType {
	date?: string;
	dateTime?: string;
	timeZone?: string;
}

export interface EventType {
	attendees?: AttendeeType[];
	created: string;
	creator: CalendarUserType;
	description?: string;
	end: EventStartEndType;
	etag: string;
	eventType: string;
	guestCanInviteOthers?: boolean;
	hangoutLink?: string;
	htmlLink: string;
	iCalUID: string;
	id: string;
	kind: string;
	location?: string;
	organizer: CalendarUserType;
	reminders: {
		useDefault: boolean;
		overrides?: Array<{
			method: 'email' | 'popup';
			minutes: number;
		}>;
	};
	/**
	 * Campo aggiunto lato server per avere sempre i promemoria "effettivi" da mostrare:
	 * - se l'evento ha overrides, usa quelli
	 * - altrimenti, se usa i default del calendario, usa i defaultReminders del calendario
	 */
	effectiveReminders?: Array<{
		method: 'email' | 'popup' | null;
		minutes: number | null;
	}>;

	/**
	 * Promemoria di default del calendario dell'utente (sempre allegati dal server
	 * quando disponibili), utili per mostrare il contesto anche quando l'evento
	 * ha useDefault=false.
	 */
	calendarDefaultReminders?: Array<{
		method: 'email' | 'popup' | null;
		minutes: number | null;
	}>;
	sequence: number;
	start: EventStartEndType;
	status: string;
	summary: string;
	updated: string;

	/** Metadati aggiunti lato server (opzionali) */
	sourceCalendarId?: string;
	sourceCalendarSummary?: string;
}

export interface TaskType {
	// Identificatori e metadati
	etag: string;
	id: string;
	kind: string; // "tasks#task"

	// Campi di stato
	status: 'needsAction' | 'completed';
	completed?: string; // RFC3339 date-time quando completato
	deleted?: boolean;
	hidden?: boolean;

	// Gerarchia e ordinamento
	parent?: string;
	position?: string;

	// Contenuti
	title: string;
	notes?: string;
	links?: Array<{
		type?: string;
		description?: string;
		link: string;
	}>;

	// Date
	due?: string; // RFC3339; può mancare
	updated: string; // RFC3339

	// Link
	selfLink?: string;
	webViewLink?: string;

	// Debug/annotazioni lato client (non parte della API ufficiale)
	listId?: string;
}