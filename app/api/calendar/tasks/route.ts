import { google } from "googleapis";
import fs from "fs";

export async function GET(): Promise<Response> {
  try {
    let tokens;

    // Controllo se il file esiste
    if (fs.existsSync("./private/google-tokens.json")) {
      tokens = JSON.parse(fs.readFileSync("./private/google-tokens.json", "utf-8"));
    } else {
      console.error("Il file google-tokens.json non esiste. Sposta i token in un database o secret store.");
      return new Response(JSON.stringify({ error: "Token mancanti. Configurazione richiesta." }), {
        status: 500,
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const tasks = google.tasks({ version: "v1", auth: oauth2Client });

    const taskListsRes = await tasks.tasklists.list();
    const firstListId = taskListsRes.data.items?.[0]?.id;
    let taskItems: any[] = [];

    if (firstListId) {
      const tasksRes = await tasks.tasks.list({ tasklist: firstListId });
      taskItems = tasksRes.data.items ?? [];
    }

    return Response.json({ tasks: taskItems });
  } catch (error) {
    console.error("Errore nel recupero Tasks:", error);
    return new Response(JSON.stringify({ error: "Errore nel recupero Tasks" }), { status: 500 });
  }
}