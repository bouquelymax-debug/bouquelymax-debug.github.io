// Fonction automatique de relances de factures + résumé quotidien.
// Version robuste : requêtes séparées (pas de jointure imbriquée), erreurs explicites.
// Réutilise votre compte EmailJS (via son API serveur).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EJS_PUBLIC = Deno.env.get("EMAILJS_PUBLIC") ?? "";
const EJS_PRIVATE = Deno.env.get("EMAILJS_PRIVATE") ?? "";
const EJS_SERVICE = Deno.env.get("EMAILJS_SERVICE") ?? "";
const EJS_TEMPLATE = Deno.env.get("EMAILJS_TEMPLATE") ?? "";
const ARTISAN_EMAIL = Deno.env.get("ARTISAN_EMAIL") ?? "";

const JOURS_AVANT_RELANCE = 7;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let dernierEmailInfo = "";
async function envoyerEmail(to_email: string, sujet: string, message: string) {
  if (!EJS_PUBLIC || !EJS_PRIVATE || !EJS_SERVICE || !EJS_TEMPLATE || !to_email) {
    dernierEmailInfo = "Config incomplète — manque: " +
      [!EJS_PUBLIC && "EMAILJS_PUBLIC", !EJS_PRIVATE && "EMAILJS_PRIVATE",
       !EJS_SERVICE && "EMAILJS_SERVICE", !EJS_TEMPLATE && "EMAILJS_TEMPLATE",
       !to_email && "adresse destinataire"].filter(Boolean).join(", ");
    return false;
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EJS_SERVICE,
        template_id: EJS_TEMPLATE,
        user_id: EJS_PUBLIC,
        accessToken: EJS_PRIVATE,
        // On envoie l'adresse sous plusieurs noms courants pour être compatible
        // avec n'importe quel réglage « To Email » du modèle EmailJS.
        template_params: {
          to_email, email: to_email, user_email: to_email, reply_to: to_email, recipient: to_email,
          to_name: "Maison Matière", sujet, subject: sujet, message,
        },
      }),
    });
    if (!res.ok) {
      dernierEmailInfo = "EmailJS a refusé — HTTP " + res.status + " : " + (await res.text());
      console.error(dernierEmailInfo);
    } else {
      dernierEmailInfo = "Envoyé ✅";
    }
    return res.ok;
  } catch (e) {
    dernierEmailInfo = "Erreur réseau: " + String(e);
    console.error(dernierEmailInfo);
    return false;
  }
}

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant (secrets)" }, 500);
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 1) Factures impayées et échues (sans jointure imbriquée)
    const { data: docs, error: errDocs } = await sb
      .from("documents")
      .select("id, nom, montant, statut, type, date_echeance, derniere_relance, chantier_id")
      .eq("type", "facture")
      .eq("statut", "en-attente")
      .lt("date_echeance", todayStr);

    if (errDocs) {
      console.error("Lecture documents:", errDocs.message);
      return json({ stage: "lecture documents", error: errDocs.message }, 500);
    }

    // 2) Récupère les chantiers concernés séparément
    const chantierIds = [...new Set((docs ?? []).map((d) => d.chantier_id).filter(Boolean))];
    const chMap: Record<string, { client_nom?: string; client_email?: string }> = {};
    if (chantierIds.length) {
      const { data: chs, error: errCh } = await sb
        .from("chantiers")
        .select("id, client_nom, client_email")
        .in("id", chantierIds);
      if (errCh) {
        console.error("Lecture chantiers:", errCh.message);
        return json({ stage: "lecture chantiers", error: errCh.message }, 500);
      }
      for (const c of chs ?? []) chMap[c.id] = { client_nom: c.client_nom, client_email: c.client_email };
    }

    let relancesEnvoyees = 0;
    let sansEmail = 0;
    const details: string[] = [];

    for (const d of docs ?? []) {
      const ch = chMap[d.chantier_id] || {};
      const email = ch.client_email;
      if (!email) { sansEmail++; continue; }

      if (d.derniere_relance) {
        const diff = (today.getTime() - new Date(d.derniere_relance).getTime()) / 86400000;
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
        details.push(`• ${ch.client_nom || ""} — ${d.nom} (${montant})`);
        await sb.from("documents").update({ derniere_relance: todayStr }).eq("id", d.id);
      }
    }

    // 3) Nouvelles demandes de devis du jour
    let nbLeads = 0;
    try {
      const { data: leads } = await sb.from("leads").select("id").gte("created_at", todayStr);
      nbLeads = (leads ?? []).length;
    } catch (_e) { /* table leads optionnelle */ }

    // 4) Résumé à l'artisan
    let resumeEnvoye = false;
    if (!ARTISAN_EMAIL) dernierEmailInfo = "Secret ARTISAN_EMAIL manquant";
    if (ARTISAN_EMAIL) {
      const resume =
        `Bonjour,\n\nRécapitulatif Maison Matière du ${today.toLocaleDateString("fr-FR")} :\n\n` +
        `• Relances de factures envoyées : ${relancesEnvoyees}\n` +
        (details.length ? details.join("\n") + "\n" : "") +
        `• Nouvelles demandes de devis aujourd'hui : ${nbLeads}\n\n` +
        `— Votre assistant Maison Matière`;
      resumeEnvoye = await envoyerEmail(ARTISAN_EMAIL, "Récap du jour — Maison Matière", resume);
    }

    return json({
      ok: true,
      facturesEchues: (docs ?? []).length,
      relancesEnvoyees,
      facturesSansEmailClient: sansEmail,
      nbLeads,
      resumeEnvoye,
      artisanEmailDefini: !!ARTISAN_EMAIL,
      detailEmail: dernierEmailInfo,
      emailjsConfigure: !!(EJS_PUBLIC && EJS_PRIVATE && EJS_SERVICE && EJS_TEMPLATE),
    });
  } catch (e) {
    console.error("Erreur inattendue:", String(e));
    return json({ error: String(e) }, 500);
  }
});
