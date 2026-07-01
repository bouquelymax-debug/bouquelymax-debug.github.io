// Fonction automatique de relances de factures + résumé quotidien.
// Hébergée sur Supabase (Edge Function), déclenchée chaque matin par le Cron.
// Réutilise votre compte EmailJS (via son API serveur).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Secrets EmailJS (à définir dans Supabase → Edge Functions → Secrets)
const EJS_PUBLIC = Deno.env.get("EMAILJS_PUBLIC") ?? "";
const EJS_PRIVATE = Deno.env.get("EMAILJS_PRIVATE") ?? "";
const EJS_SERVICE = Deno.env.get("EMAILJS_SERVICE") ?? "";
const EJS_TEMPLATE = Deno.env.get("EMAILJS_TEMPLATE") ?? "";
const ARTISAN_EMAIL = Deno.env.get("ARTISAN_EMAIL") ?? "";

const JOURS_AVANT_RELANCE = 7; // ne pas relancer plus d'une fois par semaine

async function envoyerEmail(to_email: string, sujet: string, message: string) {
  if (!EJS_PUBLIC || !EJS_PRIVATE || !EJS_SERVICE || !EJS_TEMPLATE || !to_email) return false;
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EJS_SERVICE,
      template_id: EJS_TEMPLATE,
      user_id: EJS_PUBLIC,
      accessToken: EJS_PRIVATE,
      template_params: { to_email, sujet, message },
    }),
  });
  return res.ok;
}

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Factures impayées et échues
  const { data: docs, error } = await sb
    .from("documents")
    .select("id, nom, montant, statut, date_echeance, derniere_relance, chantier_id, chantiers(client_nom, client_email)")
    .eq("type", "facture")
    .eq("statut", "en-attente")
    .lt("date_echeance", todayStr);

  if (error) return new Response("Erreur lecture: " + error.message, { status: 500 });

  let relancesEnvoyees = 0;
  const details: string[] = [];

  for (const d of docs ?? []) {
    const ch: any = (d as any).chantiers || {};
    const email = ch.client_email;
    if (!email) continue;

    // Pas plus d'une relance tous les 7 jours
    if (d.derniere_relance) {
      const last = new Date(d.derniere_relance);
      const diff = (today.getTime() - last.getTime()) / 86400000;
      if (diff < JOURS_AVANT_RELANCE) continue;
    }

    const montant = d.montant ? Number(d.montant).toFixed(2) + " €" : "";
    const sujet = "Rappel concernant votre facture — Maison Matière";
    const message =
      `Bonjour ${ch.client_nom || ""},\n\n` +
      `Sauf erreur de notre part, la facture ${d.nom}` +
      (montant ? ` d'un montant de ${montant}` : "") +
      ` reste en attente de règlement (échéance dépassée).\n` +
      `Merci de procéder au paiement dès que possible. Si c'est déjà fait, n'en tenez pas compte.\n\n` +
      `Cordialement,\nMaison Matière — 06 99 83 56 52`;

    const ok = await envoyerEmail(email, sujet, message);
    if (ok) {
      relancesEnvoyees++;
      details.push(`• ${ch.client_nom} — ${d.nom} (${montant})`);
      await sb.from("documents").update({ derniere_relance: todayStr }).eq("id", d.id);
    }
  }

  // Nouvelles demandes de devis du jour
  let nbLeads = 0;
  const { data: leads } = await sb.from("leads").select("id, created_at").gte("created_at", todayStr);
  nbLeads = (leads ?? []).length;

  // Résumé quotidien à l'artisan
  if (ARTISAN_EMAIL) {
    const resume =
      `Bonjour,\n\nRécapitulatif Maison Matière du ${today.toLocaleDateString("fr-FR")} :\n\n` +
      `• Relances de factures envoyées : ${relancesEnvoyees}\n` +
      (details.length ? details.join("\n") + "\n" : "") +
      `• Nouvelles demandes de devis aujourd'hui : ${nbLeads}\n\n` +
      `— Votre assistant Maison Matière`;
    await envoyerEmail(ARTISAN_EMAIL, "Récap du jour — Maison Matière", resume);
  }

  return new Response(JSON.stringify({ relancesEnvoyees, nbLeads }), {
    headers: { "Content-Type": "application/json" },
  });
});
