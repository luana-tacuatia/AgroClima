// Estudo retrospectivo do AgroClima — DOWNLOAD DOS DADOS (não precisa de chave).
//
// Baixa, para as 8 cidades dos polos do grupo e para set/out de 2026:
//  - as previsões feitas com 1, 2 e 3 dias de antecedência por dois modelos públicos e
//    independentes, ECMWF IFS e NCEP GFS (Open-Meteo Previous Runs API);
//  - o tempo observado (reanálise ERA5, Open-Meteo Historical Weather API).
//
// Executar na raiz do projeto (Node 20 ou mais recente):
//   node scripts/estudo-retrospectivo/baixar-dados.mjs
// Depois compacte a pasta scripts/estudo-retrospectivo/dados e envie.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "scripts", "estudo-retrospectivo", "dados");
const START = "2026-09-01";
const END = "2026-10-31";
const TZ = "America/Sao_Paulo";
const MODELS = ["ecmwf_ifs025", "gfs_seamless"];
const HOURLY = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m"];
const LEADS = [1, 2, 3];
const CITIES = [
  "Campinas", "Limeira", "Mogi Mirim", "Monte Mor",
  "Pedreira", "Santa Bárbara d'Oeste", "Serra Negra", "Socorro",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function getJson(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      const body = await res.json().catch(() => null);
      if (res.ok && body && !body.error) return body;
      throw new Error(`HTTP ${res.status}: ${body?.reason ?? JSON.stringify(body)?.slice(0, 200)}`);
    } catch (e) {
      if (i === tries) throw e;
      console.log(`  nova tentativa (${e.message})`);
      await sleep(3000 * i);
    }
  }
}

async function geocode(name) {
  const p = new URLSearchParams({ name, count: "10", language: "pt", format: "json" });
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${p}`);
  const r = (data.results ?? []).find((x) => x.admin1 === "São Paulo" && x.country_code === "BR");
  if (!r) throw new Error(`Cidade não encontrada em SP: ${name}`);
  return { name, slug: slug(name), latitude: r.latitude, longitude: r.longitude };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const cities = [];
  for (const name of CITIES) cities.push(await geocode(name));
  writeFileSync(join(OUT, "cidades.json"), JSON.stringify(cities, null, 2));

  const hourly = HOURLY.flatMap((v) => LEADS.map((n) => `${v}_previous_day${n}`));
  let ok = 0;
  for (const c of cities) {
    process.stdout.write(`${c.name}... `);
    const base = { latitude: String(c.latitude), longitude: String(c.longitude), timezone: TZ,
      start_date: START, end_date: END };
    try {
      const prev = await getJson("https://previous-runs-api.open-meteo.com/v1/forecast?" +
        new URLSearchParams({ ...base, hourly: hourly.join(","), models: MODELS.join(",") }));
      writeFileSync(join(OUT, `${c.slug}_previsoes.json`), JSON.stringify(prev));
      const obs = await getJson("https://archive-api.open-meteo.com/v1/archive?" +
        new URLSearchParams({ ...base, hourly: HOURLY.join(","),
          daily: "temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max" }));
      writeFileSync(join(OUT, `${c.slug}_observado.json`), JSON.stringify(obs));
      ok++;
      console.log("ok");
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
    }
    await sleep(1500);
  }
  console.log(`\n${ok} de ${cities.length} cidades baixadas em ${OUT}`);
  console.log("Compacte a pasta 'dados' e envie.");
}

main().catch((e) => { console.error(e); process.exit(1); });
