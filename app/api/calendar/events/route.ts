import { google } from "googleapis";
import { getGoogleTokens, getUserGoogleTokens } from "@/lib/google-tokens";
import { NextRequest } from "next/server";
import { isAuthorizedTelegramUser } from "@/lib/telegram-auth";

// Evitiamo cache di Next su questo endpoint: vogliamo dati freschi
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const urlTop = new URL(req.url);
  const userId = urlTop.searchParams.get('userId');
  // Usa OAuth dell'utente (come per i Tasks) così possiamo leggere i defaultReminders
  // e vedere i promemoria effettivi esattamente come nella UI dell'utente.
  let tokens = null as any;
  if (userId) {
    const ok = await isAuthorizedTelegramUser(userId);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
    }
    tokens = await getUserGoogleTokens(userId);
  } else {
    // fallback legacy
    tokens = await getGoogleTokens();
  }
  if (!tokens) {
    return new Response(
      JSON.stringify({
        error: "Non autenticato",
        message: "Token Google mancanti. Premi 'Connetti Google' per autenticarti.",
      }),
      { status: 401 }
    );
  }
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  // Supporto multi-calendario:
  // - GOOGLE_CALENDAR_IDS (separati da virgola)
  // - GOOGLE_CALENDAR_NAMES (separati da virgola) risolti tramite calendarList
  // - query string ?ids=... o ?names=... (opzionale)
  const url = new URL(req.url);
  const qsIds = url.searchParams.get("ids");
  const qsNames = url.searchParams.get("names");

  const envIds = (process.env.GOOGLE_CALENDAR_IDS || "").trim();
  const envNames = (process.env.GOOGLE_CALENDAR_NAMES || "").trim();
  const singleId = (process.env.GOOGLE_CALENDAR_ID || "").trim();

  const parseCsv = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean);

  let targetIds: string[] | null = null;
  let targetNames: string[] | null = null;

  if (qsIds) targetIds = parseCsv(qsIds);
  else if (envIds) targetIds = parseCsv(envIds);

  if (!targetIds) {
    if (qsNames) targetNames = parseCsv(qsNames);
    else if (envNames) targetNames = parseCsv(envNames);
  }

  // Se non abbiamo né ids né names, manteniamo il comportamento precedente con un solo ID
  if (!targetIds && !targetNames && !singleId) {
    return new Response(JSON.stringify({ error: "Nessun calendario configurato. Definisci GOOGLE_CALENDAR_ID oppure GOOGLE_CALENDAR_IDS o GOOGLE_CALENDAR_NAMES." }), { status: 500 });
  }

  // Se abbiamo nomi, prima risolviamoli in IDs con calendarList
  if (!targetIds && targetNames) {
    try {
      const list = await calendar.calendarList.list({ maxResults: 250 });
      const entries = list.data.items || [];
      const nameToId = new Map<string, string>();
      for (const entry of entries) {
        const summary = (entry.summary || "").trim();
        if (summary) nameToId.set(summary.toLowerCase(), entry.id!);
      }
      targetIds = targetNames
        .map(n => nameToId.get(n.toLowerCase()))
        .filter((id): id is string => Boolean(id));
    } catch (err: any) {
      const code = err?.code || err?.status;
      if (code === 403) {
        return new Response(
          JSON.stringify({
            error: "Insufficient scopes",
            message:
              "Il token non ha i permessi per leggere la lista calendari. Premi 'Connetti Google' per riautorizzare con 'calendar.readonly'.",
          }),
          { status: 401 }
        );
      }
      throw err;
    }
  }

  // Fallback a singolo ID se ancora non abbiamo targetIds
  if ((!targetIds || targetIds.length === 0) && singleId) {
    targetIds = [singleId];
  }

  if (!targetIds || targetIds.length === 0) {
    return new Response(JSON.stringify({ error: "Nessun calendario valido trovato (verifica nomi/ids)." }), { status: 400 });
  }

  // Per ogni calendario, prendi eventi e defaultReminders, poi unisci
  const nowIso = new Date().toISOString();
  const perCalMax = 10; // manteniamo lo stesso limite per calendario

  type Fetched = { items: any[]; defaultReminders: Array<{ method?: string | null; minutes?: number | null }>; calendarId: string; calendarSummary?: string };
  const results: Fetched[] = [];

  // Recupero la calendarList una volta per ottenere i summary (opzionale)
  let calendarListMap = new Map<string, { summary?: string; defaultReminders?: Array<{ method?: string | null; minutes?: number | null }> }>();
  try {
    const list = await calendar.calendarList.list({ maxResults: 250 });
    for (const entry of list.data.items || []) {
      if (entry.id) {
        calendarListMap.set(entry.id, {
          summary: entry.summary || undefined,
          defaultReminders: entry.defaultReminders || [],
        });
      }
    }
  } catch (err) {
    // opzionale, in caso di errore recupereremo defaultReminders per singolo calendario sotto
    console.warn("calendarList.list non disponibile per metadata riassuntivi");
  }

  for (const calId of targetIds) {
    try {
      const [eventsRes, defaults] = await Promise.all([
        calendar.events.list({
          calendarId: calId,
          timeMin: nowIso,
          maxResults: perCalMax,
          singleEvents: true,
          orderBy: "startTime",
          // Partial response (includiamo i campi usati dal client)
          fields:
            "items(id,summary,description,location,hangoutLink,attendees(email,self,responseStatus,organizer),start,end,updated,created,etag,htmlLink,iCalUID,kind,status,organizer(email,self),creator(email,self),eventType,guestsCanInviteOthers,reminders(useDefault,overrides(method,minutes)),transparency),nextPageToken",
        }),
        (async () => {
          // prova da cache calendarList, altrimenti chiama get
          const cached = calendarListMap.get(calId)?.defaultReminders ?? null;
          if (cached) return cached;
          try {
            const entry = await calendar.calendarList.get({ calendarId: calId });
            return entry.data.defaultReminders ?? [];
          } catch (e) {
            console.warn("calendarList.get defaultReminders non disponibile per", calId);
            return [] as Array<{ method?: string | null; minutes?: number | null }>;
          }
        })(),
      ]);

      const rawItems = (eventsRes.data.items ?? []).filter((ev: any) => ev?.eventType !== "birthday");
      const defaultReminders = defaults ?? [];
      const calendarSummary = calendarListMap.get(calId)?.summary;
      results.push({ items: rawItems, defaultReminders, calendarId: calId, calendarSummary });
    } catch (err: any) {
      const code = err?.code || err?.status;
      if (code === 403) {
        return new Response(
          JSON.stringify({
            error: "Insufficient scopes",
            message:
              "Il token non ha i permessi Calendar. Premi 'Connetti Google' per riautorizzare con 'calendar.readonly'.",
          }),
          { status: 401 }
        );
      }
      // In caso di errore su un calendario, continuiamo con gli altri
      console.warn("Errore nel recupero eventi per calendario", calId, err?.message || err);
    }
  }

  // Normalizza tutti gli eventi aggiungendo effectiveReminders e metadati del calendario
  const merged = results.flatMap(({ items, defaultReminders, calendarId, calendarSummary }) =>
    items.map((ev: any) => {
      const overrides = ev?.reminders?.overrides;
      const useDefault = ev?.reminders?.useDefault;
      const effective = (Array.isArray(overrides) && overrides.length > 0)
        ? overrides
        : (useDefault ? defaultReminders : []);
      return {
        ...ev,
        effectiveReminders: effective,
        calendarDefaultReminders: defaultReminders,
        sourceCalendarId: calendarId,
        sourceCalendarSummary: calendarSummary,
      };
    })
  );

  // Ordina per start time crescente
  const parseStart = (ev: any) => new Date(ev?.start?.dateTime || ev?.start?.date || 0).getTime();
  merged.sort((a, b) => parseStart(a) - parseStart(b));

  return Response.json(merged);
}