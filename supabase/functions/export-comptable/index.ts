// Export comptable mensuel automatique.
// Génère un CSV (factures + dépenses du mois précédent), le stocke dans Supabase Storage,
// et envoie le lien par email (à l'artisan et/ou au comptable). Déclenché par cron le 1er du mois.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EJS_PUBLIC = Deno.env.get("EMAILJS_PUBLIC") ?? "";
const EJS_PRIVATE = Deno.env.get("EMAILJS_PRIVATE") ?? "";
const EJS_SERVICE = Deno.env.get("EMAILJS_SERVICE") ?? "";
const EJS_TEMPLATE = Deno.env.get("EMAILJS_TEMPLATE") ?? "";
const ARTISAN_EMAIL = Deno.env.get("ARTISAN_EMAIL") ?? "";
const COMPTABLE_EMAIL = Deno.env.get("COMPTABLE_EMAIL") ?? ""; // optionnel

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

function euro(n: number) { return (Number(n) || 0).toFixed(2).replace(".", ","); }

function champ(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

let dernierEmailInfo = "";
async function envoyerEmail(to_email: string, sujet: string, message: string) {
  if (!EJS_PUBLIC || !EJS_PRIVATE || !EJS_SERVICE || !EJS_TEMPLATE || !to_email) {
    dernierEmailInfo = "Config email incomplète ou destinataire vide"; return false;
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EJS_SERVICE, template_id: EJS_TEMPLATE, user_id: EJS_PUBLIC, accessToken: EJS_PRIVATE,
        template_params: { to_email, email: to_email, user_email: to_email, recipient: to_email, to_name: "Maison Matière", sujet, subject: sujet, message },
      }),
    });
    dernierEmailInfo = res.ok ? "Envoyé ✅" : "EmailJS HTTP " + res.status + " : " + (await res.text());
    return res.ok;
  } catch (e) { dernierEmailInfo = "Erreur réseau: " + String(e); return false; }
}

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Secrets Supabase manquants" }, 500);
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Mois précédent
    const now = new Date();
    const debut = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fin = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutStr = debut.toISOString().split("T")[0];
    const finStr = fin.toISOString().split("T")[0];
    const libMois = MOIS_FR[debut.getMonth()] + " " + debut.getFullYear();
    const cle = debut.getFullYear() + "-" + String(debut.getMonth() + 1).padStart(2, "0");

    // Factures du mois (par date de création)
    const { data: docs, error: eDocs } = await sb.from("documents")
      .select("nom, montant, statut, type, created_at, date_paiement, chantier_id, fichier_url")
      .eq("type", "facture").gte("created_at", debutStr).lt("created_at", finStr);
    if (eDocs) return json({ stage: "documents", error: eDocs.message }, 500);

    // Clients
    const ids = [...new Set((docs ?? []).map((d) => d.chantier_id).filter(Boolean))];
    const chMap: Record<string, string> = {};
    if (ids.length) {
      const { data: chs } = await sb.from("chantiers").select("id, client_nom").in("id", ids);
      for (const c of chs ?? []) chMap[c.id] = c.client_nom || "";
    }

    // Dépenses du mois
    const { data: deps, error: eDep } = await sb.from("depenses")
      .select("libelle, categorie, montant, montant_ht, tva, montant_ttc, date")
      .gte("date", debutStr).lt("date", finStr);
    if (eDep) return json({ stage: "depenses", error: eDep.message }, 500);

    // Totaux
    const caFacture = (docs ?? []).reduce((s, d) => s + (Number(d.montant) || 0), 0);
    const encaisse = (docs ?? []).filter((d) => d.statut === "paye").reduce((s, d) => s + (Number(d.montant) || 0), 0);
    const totalDep = (deps ?? []).reduce((s, d) => s + (Number(d.montant_ttc ?? d.montant) || 0), 0);
    const tvaDeduct = (deps ?? []).reduce((s, d) => s + (Number(d.tva) || 0), 0);

    // Construction du CSV (séparateur ; pour Excel FR, décimales à virgule, BOM UTF-8)
    const L: string[] = [];
    L.push("EXPORT COMPTABLE;" + libMois);
    L.push("");
    L.push("RÉSUMÉ");
    L.push("CA facturé (TTC);" + euro(caFacture));
    L.push("Encaissé (payé);" + euro(encaisse));
    L.push("Dépenses (TTC);" + euro(totalDep));
    L.push("TVA déductible (dépenses);" + euro(tvaDeduct));
    L.push("Bénéfice (encaissé - dépenses);" + euro(encaisse - totalDep));
    L.push("");
    L.push("FACTURES");
    L.push("Date;Numéro;Client;Statut;Montant TTC (€)");
    for (const d of docs ?? []) {
      L.push([
        new Date(d.created_at).toLocaleDateString("fr-FR"),
        champ(d.nom), champ(chMap[d.chantier_id] || ""),
        d.statut === "paye" ? "Payé" : "En attente", euro(Number(d.montant) || 0),
      ].join(";"));
    }
    L.push("");
    L.push("DÉPENSES");
    L.push("Date;Libellé;Catégorie;HT (€);TVA (€);TTC (€)");
    for (const d of deps ?? []) {
      L.push([
        d.date ? new Date(d.date).toLocaleDateString("fr-FR") : "",
        champ(d.libelle), champ(d.categorie),
        d.montant_ht != null ? euro(Number(d.montant_ht)) : "",
        d.tva != null ? euro(Number(d.tva)) : "",
        euro(Number(d.montant_ttc ?? d.montant) || 0),
      ].join(";"));
    }
    const csv = "﻿" + L.join("\r\n"); // BOM pour les accents dans Excel

    // Upload dans le stockage
    const chemin = "exports/comptable_" + cle + ".csv";
    const { error: eUp } = await sb.storage.from("documents").upload(chemin, new Blob([csv], { type: "text/csv" }), { upsert: true, contentType: "text/csv; charset=utf-8" });
    if (eUp) return json({ stage: "upload", error: eUp.message }, 500);
    const { data: pub } = sb.storage.from("documents").getPublicUrl(chemin);
    const lien = pub.publicUrl;

    // Email
    const destinataires = [...new Set([COMPTABLE_EMAIL, ARTISAN_EMAIL].filter(Boolean))];
    const message =
      "Bonjour,\n\nVoici l'export comptable de " + libMois + " (Maison Matière) :\n\n" +
      "• CA facturé (TTC) : " + euro(caFacture) + " €\n" +
      "• Encaissé : " + euro(encaisse) + " €\n" +
      "• Dépenses (TTC) : " + euro(totalDep) + " €\n" +
      "• TVA déductible : " + euro(tvaDeduct) + " €\n" +
      "• Bénéfice (encaissé - dépenses) : " + euro(encaisse - totalDep) + " €\n\n" +
      "Fichier détaillé (factures + dépenses) à télécharger :\n" + lien + "\n\n" +
      "— Export automatique Maison Matière";

    let envoyes = 0;
    for (const dest of destinataires) { if (await envoyerEmail(dest, "Export comptable — " + libMois, message)) envoyes++; }

    // Liste des PDF de factures du mois (pour sauvegarde automatique sur Google Drive)
    const facturesPdf = (docs ?? [])
      .filter((d) => d.fichier_url)
      .map((d) => ({
        nom: (d.nom || "facture") + ".pdf",
        client: chMap[d.chantier_id] || "",
        url: d.fichier_url as string,
      }));

    return json({ ok: true, mois: libMois, cle, nbFactures: (docs ?? []).length, nbDepenses: (deps ?? []).length, lien, facturesPdf, emailsEnvoyes: envoyes, detailEmail: dernierEmailInfo });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
