// Flux iCal (.ics) public du calendrier Maison Matière.
// Google Agenda s'y abonne (Autres agendas → À partir de l'URL) et affiche
// automatiquement les RDV et les périodes de chantier. Lecture seule.
//
// ⚠️ Cette fonction doit être déployée avec « Verify JWT » DÉSACTIVÉ
//    (Google appelle l'URL sans jeton d'authentification).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PERSONNES: Record<string, string> = { maxence: "Maxence", guillaume: "Guillaume", deux: "Maxence & Guillaume" };

// Échappement des caractères spéciaux iCal
function esc(v: unknown): string {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
// AAAA-MM-JJ -> AAAAMMJJ
function dateIcal(d: string): string { return d.replace(/-/g, ""); }
// AAAA-MM-JJ + HH:MM -> AAAAMMJJTHHMMSS (heure locale Europe/Paris)
function dateTimeIcal(d: string, h: string): string {
  const hh = (h || "09:00").slice(0, 5).replace(":", "");
  return dateIcal(d) + "T" + hh + "00";
}
// Ajoute 1 jour (DTEND exclusif pour les événements « journée »)
function plusUnJour(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}
function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

Deno.serve(async () => {
  const entete = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'inline; filename="maison-matiere.ics"',
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
  };
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const L: string[] = [];
    L.push("BEGIN:VCALENDAR");
    L.push("VERSION:2.0");
    L.push("PRODID:-//Maison Matiere//Agenda//FR");
    L.push("CALSCALE:GREGORIAN");
    L.push("METHOD:PUBLISH");
    L.push("X-WR-CALNAME:Maison Matière");
    L.push("X-WR-TIMEZONE:Europe/Paris");
    // Définition du fuseau (pour les heures locales)
    L.push("BEGIN:VTIMEZONE");
    L.push("TZID:Europe/Paris");
    L.push("BEGIN:DAYLIGHT");
    L.push("TZOFFSETFROM:+0100");
    L.push("TZOFFSETTO:+0200");
    L.push("TZNAME:CEST");
    L.push("DTSTART:19700329T020000");
    L.push("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
    L.push("END:DAYLIGHT");
    L.push("BEGIN:STANDARD");
    L.push("TZOFFSETFROM:+0200");
    L.push("TZOFFSETTO:+0100");
    L.push("TZNAME:CET");
    L.push("DTSTART:19701025T030000");
    L.push("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU");
    L.push("END:STANDARD");
    L.push("END:VTIMEZONE");

    const ts = stamp();

    // 1) RDV / événements
    let evts: any[] = [];
    try {
      const { data } = await sb.from("evenements").select("*").order("date");
      evts = data || [];
    } catch (_e) { evts = []; }

    for (const e of evts) {
      if (!e.date) continue;
      L.push("BEGIN:VEVENT");
      L.push("UID:evt-" + e.id + "@maisonmatiere");
      L.push("DTSTAMP:" + ts);
      if (e.heure) {
        L.push("DTSTART;TZID=Europe/Paris:" + dateTimeIcal(e.date, e.heure));
        // durée 1 h par défaut
        const fin = new Date(e.date + "T" + (e.heure.slice(0, 5)) + ":00");
        fin.setHours(fin.getHours() + 1);
        const hh = String(fin.getHours()).padStart(2, "0") + ":" + String(fin.getMinutes()).padStart(2, "0");
        L.push("DTEND;TZID=Europe/Paris:" + dateTimeIcal(e.date, hh));
      } else {
        L.push("DTSTART;VALUE=DATE:" + dateIcal(e.date));
        L.push("DTEND;VALUE=DATE:" + dateIcal(plusUnJour(e.date_fin || e.date)));
      }
      const qui = e.assigne ? " [" + (PERSONNES[e.assigne] || e.assigne) + "]" : "";
      L.push("SUMMARY:" + esc((e.titre || "Rendez-vous") + qui));
      if (e.lieu) L.push("LOCATION:" + esc(e.lieu));
      if (e.notes) L.push("DESCRIPTION:" + esc(e.notes));
      L.push("END:VEVENT");
    }

    // 2) Périodes de chantier (journée, du début à la fin prévue)
    let chantiers: any[] = [];
    try {
      const { data } = await sb.from("chantiers").select("id, client_nom, adresse, date_debut, date_fin");
      chantiers = data || [];
    } catch (_e) { chantiers = []; }

    for (const c of chantiers) {
      if (!c.date_debut) continue;
      L.push("BEGIN:VEVENT");
      L.push("UID:chantier-" + c.id + "@maisonmatiere");
      L.push("DTSTAMP:" + ts);
      L.push("DTSTART;VALUE=DATE:" + dateIcal(c.date_debut));
      L.push("DTEND;VALUE=DATE:" + dateIcal(plusUnJour(c.date_fin || c.date_debut)));
      L.push("SUMMARY:" + esc("🏠 Chantier — " + (c.client_nom || "")));
      if (c.adresse) L.push("LOCATION:" + esc(c.adresse));
      L.push("END:VEVENT");
    }

    L.push("END:VCALENDAR");

    // Repli des lignes à 75 octets (recommandation RFC 5545) — simple, suffisant ici
    const corps = L.join("\r\n") + "\r\n";
    return new Response(corps, { headers: entete });
  } catch (e) {
    return new Response("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n", { headers: entete });
  }
});
