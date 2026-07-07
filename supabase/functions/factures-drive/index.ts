// Liste toutes les factures définitives (PDF) pour la sauvegarde Google Drive.
// Appelée par un Google Apps Script qui recopie les nouveaux PDF dans un dossier « Factures ».
//
// ⚠️ À déployer avec « Verify JWT » DÉSACTIVÉ (l'Apps Script appelle sans jeton).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// Nettoie un nom de fichier pour Drive/Windows
function nomFichier(nom: string, client: string, dateStr: string): string {
  const d = dateStr ? new Date(dateStr).toISOString().split("T")[0] : "";
  const base = [d, nom, client].filter(Boolean).join(" - ").replace(/[\\/:*?"<>|]/g, "-").trim();
  return (base || "facture") + ".pdf";
}

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Secrets Supabase manquants" }, 500);
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: docs, error } = await sb.from("documents")
      .select("nom, montant, created_at, chantier_id, fichier_url")
      .eq("type", "facture")
      .not("fichier_url", "is", null)
      .order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);

    // Noms des clients
    const ids = [...new Set((docs ?? []).map((d) => d.chantier_id).filter(Boolean))];
    const chMap: Record<string, string> = {};
    if (ids.length) {
      const { data: chs } = await sb.from("chantiers").select("id, client_nom").in("id", ids);
      for (const c of chs ?? []) chMap[c.id] = c.client_nom || "";
    }

    const factures = (docs ?? []).map((d) => ({
      nom: nomFichier(d.nom || "facture", chMap[d.chantier_id] || "", d.created_at),
      client: chMap[d.chantier_id] || "",
      montant: Number(d.montant) || 0,
      date: d.created_at,
      url: d.fichier_url as string,
    }));

    return json({ ok: true, total: factures.length, factures });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
