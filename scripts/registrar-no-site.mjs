// Registra no histórico do AgroClima publicado (Vercel + Supabase) as mesmas cidades da coleta.
// Usa as coordenadas de scripts/segunda-aplicacao/cidades.json (criado na primeira coleta).
//
// Uso, na raiz do projeto, logo depois do coletar.ts:
//   node registrar-no-site.mjs https://SEU-ENDERECO.vercel.app

import { readFileSync } from "node:fs";

const site = (process.argv[2] ?? "").replace(/\/$/, "");
if (!site.startsWith("https://")) {
  console.error("Informe o endereço do site: node registrar-no-site.mjs https://....vercel.app");
  process.exit(1);
}
const cities = JSON.parse(readFileSync("scripts/segunda-aplicacao/cidades.json", "utf-8"));

for (const c of cities) {
  const params = new URLSearchParams({
    lat: String(c.latitude), lon: String(c.longitude), name: c.name, state: c.state ?? "São Paulo", country: "Brasil",
  });
  try {
    const res = await fetch(`${site}/api/forecast?${params}`, { signal: AbortSignal.timeout(30_000) });
    const body = await res.json();
    const fontes = Object.entries(body.sourceStatus ?? {}).map(([k, v]) => `${k}: ${v.status}`).join(", ");
    const hist = body.history?.saved === true ? "| histórico gravado"
      : body.history ? `| histórico NÃO gravado: ${body.history.reason}` : "";
    console.log(`${c.name}/${c.uf ?? "SP"}: HTTP ${res.status} | ${fontes}${body.cached ? " | (cache)" : ""} ${hist}`);
  } catch (e) {
    console.log(`${c.name}: ERRO ${e.message}`);
  }
}
console.log(`\nConfira em ${site}/historico`);
