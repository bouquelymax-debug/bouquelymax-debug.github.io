// Analyse une facture fournisseur (photo ou PDF) et renvoie les champs structurés.
// Priorité à Claude (Anthropic) si ANTHROPIC_API_KEY est défini, sinon Google Gemini.
// Les clés restent secrètes côté serveur.

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-6";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = `Analyse cette facture fournisseur (artisan du bâtiment) et renvoie UNIQUEMENT un objet JSON valide, sans texte autour, avec exactement ces clés :
{
  "fournisseur": string,
  "date": string|null,          // date de la facture, format YYYY-MM-DD
  "echeance": string|null,      // date d'échéance si présente, format YYYY-MM-DD, sinon null
  "comptant": boolean,          // true si paiement au comptant / à réception
  "montant_ht": number|null,    // total HT en euros
  "tva": number|null,           // montant total de TVA en euros
  "montant_ttc": number,        // TOTAL TTC = le montant final à payer (le plus grand total, TVA incluse)
  "categorie": string,          // une seule parmi: Matériaux, Outillage, Véhicule, Carburant, Sous-traitance, Assurances, Charges, Autre
  "recurrence": string          // "ponctuel", "mensuel" ou "annuel"
}
Règles: nombres avec point décimal, sans symbole ni séparateur de milliers. montant_ttc est le TOTAL À PAYER TTC (jamais le HT ni un sous-total). Si une valeur est absente, mets null (sauf montant_ttc, categorie, recurrence).`;

function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function extraireJSON(txt: string) {
  try { return JSON.parse(txt); } catch { const m = txt.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

async function viaClaude(fileBase64: string, mimeType: string) {
  const estPdf = (mimeType || "").includes("pdf");
  const media = estPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: fileBase64 } };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: [media, { type: "text", text: PROMPT }] }],
    }),
  });
  if (!res.ok) throw new Error("Claude: " + (await res.text()));
  const j = await res.json();
  const txt = (j?.content?.[0]?.text) ?? "{}";
  return extraireJSON(txt);
}

async function viaGemini(fileBase64: string, mimeType: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType || "image/jpeg", data: fileBase64 } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, response_mime_type: "application/json" },
    }),
  });
  if (!res.ok) throw new Error("Gemini: " + (await res.text()));
  const j = await res.json();
  return extraireJSON(j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64) return jsonResp({ error: "Aucun fichier" }, 400);
    let data;
    if (ANTHROPIC_KEY) data = await viaClaude(fileBase64, mimeType);
    else if (GEMINI_KEY) data = await viaGemini(fileBase64, mimeType);
    else return jsonResp({ error: "Aucune clé IA configurée (ANTHROPIC_API_KEY ou GEMINI_API_KEY)" }, 500);
    return jsonResp(data);
  } catch (e) {
    return jsonResp({ error: String(e) }, 500);
  }
});
