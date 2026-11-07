// Segunda aplicação do protótipo — ANÁLISE.
// 1) Aplica as regras do AgroClima (src/lib/weather/compare.ts) a todas as coletas salvas.
// 2) Busca os valores observados (reanálise ERA5, Open-Meteo Historical Weather API, sem chave)
//    para as datas já disponíveis (a reanálise tem atraso de cerca de 5 dias) e calcula o erro
//    de cada fonte e do valor consolidado.
//
// Executar na raiz do projeto (pode ser rodado várias vezes; refaz tudo a partir de dados/):
//   npx tsx scripts/segunda-aplicacao/analisar.ts

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { compareDay, compareMetric, METRIC_KEYS } from "@/lib/weather/compare";
import type { AgreementLevel, MetricKey } from "@/types/comparison";
import type { DailyForecast } from "@/types/forecast";

const DIR = join(process.cwd(), "scripts", "segunda-aplicacao");
const DATA_DIR = join(DIR, "dados");
const OUT_DIR = join(DIR, "resultados");

interface City {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}
interface Collection {
  city: City;
  collectedAt: string;
  collectionDate: string;
  openMeteo: DailyForecast[] | null;
  weatherApi: DailyForecast[] | null;
  errors: Record<string, string>;
}

// Variáveis com valor observado na reanálise (umidade e chance de chuva não entram no erro).
const OBSERVED: Partial<Record<MetricKey, string>> = {
  temperatureMinC: "temperature_2m_min",
  temperatureMaxC: "temperature_2m_max",
  precipitationMm: "precipitation_sum",
  windSpeedMaxKmh: "wind_speed_10m_max",
};
const RAIN_MM = 1; // dia com chuva: precipitação observada ou prevista >= 1 mm

const LEVELS: AgreementLevel[] = ["high", "medium", "low"];
const PT: Record<AgreementLevel, string> = { high: "Alta", medium: "Média", low: "Baixa", unavailable: "Indisp." };
const LABEL: Record<MetricKey, string> = {
  temperatureMinC: "Temp. mínima (°C)",
  temperatureMaxC: "Temp. máxima (°C)",
  humidityPercent: "Umidade (%)",
  precipitationMm: "Precipitação (mm)",
  precipitationProbabilityPercent: "Prob. chuva (%)",
  windSpeedMaxKmh: "Vento máx. (km/h)",
};

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: Record<string, unknown>[]) =>
  rows.length === 0
    ? ""
    : [Object.keys(rows[0]).join(";"), ...rows.map((r) => Object.values(r).map(csvCell).join(";"))].join("\n");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function loadCollections(): Collection[] {
  if (!existsSync(DATA_DIR)) throw new Error("Nenhuma coleta encontrada. Rode antes coletar.ts.");
  const out: Collection[] = [];
  for (const day of readdirSync(DATA_DIR).sort()) {
    const dayDir = join(DATA_DIR, day);
    for (const file of readdirSync(dayDir).filter((f) => f.endsWith(".json"))) {
      out.push(JSON.parse(readFileSync(join(dayDir, file), "utf-8")));
    }
  }
  return out;
}

/** Busca os valores diários observados (reanálise) para uma cidade e um intervalo de datas. */
async function fetchObserved(city: City, start: string, end: string) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    start_date: start,
    end_date: end,
    daily: Object.values(OBSERVED).join(","),
    timezone: "auto",
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Archive API respondeu ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const byDate = new Map<string, Partial<Record<MetricKey, number | null>>>();
  (data.daily?.time ?? []).forEach((date: string, i: number) => {
    const values: Partial<Record<MetricKey, number | null>> = {};
    for (const [key, field] of Object.entries(OBSERVED)) {
      const v = data.daily[field as string]?.[i];
      values[key as MetricKey] = typeof v === "number" ? v : null;
    }
    byDate.set(date, values);
  });
  return byDate;
}

async function main() {
  const collections = loadCollections();
  mkdirSync(OUT_DIR, { recursive: true });

  // ---------- 1) Comparação entre as fontes ----------
  const comparisons: Record<string, unknown>[] = [];
  const days: Record<string, unknown>[] = [];
  for (const c of collections) {
    for (const a of c.openMeteo ?? []) {
      const b = c.weatherApi?.find((d) => d.date === a.date);
      if (!b) continue;
      const day = compareDay(a.date, a, b);
      const lead = daysBetween(c.collectionDate, a.date);
      days.push({ coleta: c.collectionDate, cidade: c.city.name, data: a.date, antecedencia_dias: lead,
        concordancia_geral: PT[day.overallAgreement] });
      for (const key of METRIC_KEYS) {
        const m = day.metrics[key];
        const original = compareMetric(m.sourceA, m.sourceB); // sem tolerância (regra original)
        comparisons.push({
          coleta: c.collectionDate, hora_coleta: c.collectedAt, cidade: c.city.name, data: a.date,
          antecedencia_dias: lead, variavel: key, open_meteo: m.sourceA, weather_api: m.sourceB,
          consolidado: m.consolidated, diferenca: m.absoluteDifference, divergencia_pct: m.percentageDivergence,
          concordancia: PT[m.agreement], concordancia_regra_original: PT[original.agreement],
        });
      }
    }
  }
  writeFileSync(join(OUT_DIR, "comparacoes.csv"), toCsv(comparisons));
  writeFileSync(join(OUT_DIR, "dias.csv"), toCsv(days));

  const byMetric = METRIC_KEYS.map((key) => {
    const rows = comparisons.filter((r) => r.variavel === key);
    const count = (lvl: AgreementLevel) => rows.filter((r) => r.concordancia === PT[lvl]).length;
    const divs = rows.map((r) => r.divergencia_pct as number).filter((x) => x !== null);
    const diffs = rows.map((r) => r.diferenca as number).filter((x) => x !== null);
    return {
      Variável: LABEL[key], N: rows.length,
      "Alta %": r1((100 * count("high")) / (rows.length || 1)),
      "Média %": r1((100 * count("medium")) / (rows.length || 1)),
      "Baixa %": r1((100 * count("low")) / (rows.length || 1)),
      "Diferença média": r1(mean(diffs)),
      "Divergência mediana %": r1(divs.length ? [...divs].sort((x, y) => x - y)[Math.floor(divs.length / 2)] : null),
      "Baixa (regra original) %": r1((100 * rows.filter((r) => r.concordancia_regra_original === "Baixa").length) / (rows.length || 1)),
    };
  });
  const overall = LEVELS.map((lvl) => ({
    "Concordância geral": PT[lvl],
    Dias: days.filter((d) => d.concordancia_geral === PT[lvl]).length,
    "%": r1((100 * days.filter((d) => d.concordancia_geral === PT[lvl]).length) / (days.length || 1)),
  }));

  console.log(`\nColetas: ${new Set(collections.map((c) => c.collectionDate)).size} dia(s), `
    + `${new Set(collections.map((c) => c.city.slug)).size} cidade(s), ${days.length} dias comparados.`);
  console.log("\n1) Concordância por variável");
  console.table(byMetric);
  console.log("Concordância geral dos dias");
  console.table(overall);

  // ---------- 2) Comparação com o observado ----------
  const today = new Date().toISOString().slice(0, 10);
  const cities = new Map(collections.map((c) => [c.city.slug, c.city]));
  const errors: Record<string, unknown>[] = [];
  for (const [slug, city] of cities) {
    const dates = comparisons.filter((r) => r.cidade === city.name).map((r) => r.data as string);
    if (!dates.length) continue;
    const start = dates.reduce((a, b) => (a < b ? a : b));
    const end = dates.reduce((a, b) => (a > b ? a : b));
    if (daysBetween(start, today) < 1) continue;
    let observed: Awaited<ReturnType<typeof fetchObserved>>;
    try {
      observed = await fetchObserved(city, start, end < today ? end : today);
    } catch (e) {
      console.log(`Observado indisponível para ${city.name}: ${(e as Error).message}`);
      continue;
    }
    for (const r of comparisons.filter((x) => x.cidade === city.name)) {
      const key = r.variavel as MetricKey;
      if (!(key in OBSERVED)) continue;
      const obs = observed.get(r.data as string)?.[key];
      if (obs === null || obs === undefined) continue; // ainda não disponível
      const a = r.open_meteo as number, b = r.weather_api as number, cons = r.consolidado as number;
      errors.push({
        ...r, observado: obs, erro_open_meteo: Math.abs(a - obs), erro_weather_api: Math.abs(b - obs),
        erro_consolidado: Math.abs(cons - obs),
      });
    }
    void slug;
  }
  writeFileSync(join(OUT_DIR, "erros.csv"), toCsv(errors));

  const summary: Record<string, unknown> = { gerado_em: new Date().toISOString(), byMetric, overall };
  if (errors.length === 0) {
    console.log("\n2) Ainda não há valores observados para as datas coletadas "
      + "(a reanálise tem atraso de ~5 dias). Rode de novo mais tarde.");
  } else {
    const errTable = Object.keys(OBSERVED).map((k) => {
      const rows = errors.filter((e) => e.variavel === k);
      return {
        Variável: LABEL[k as MetricKey], N: rows.length,
        "Erro médio Open-Meteo": r1(mean(rows.map((e) => e.erro_open_meteo as number))),
        "Erro médio WeatherAPI": r1(mean(rows.map((e) => e.erro_weather_api as number))),
        "Erro médio consolidado": r1(mean(rows.map((e) => e.erro_consolidado as number))),
      };
    });
    const byAgreement = Object.keys(OBSERVED).flatMap((k) =>
      LEVELS.map((lvl) => {
        const rows = errors.filter((e) => e.variavel === k && e.concordancia === PT[lvl]);
        return {
          Variável: LABEL[k as MetricKey], Concordância: PT[lvl], N: rows.length,
          "Erro médio consolidado": r1(mean(rows.map((e) => e.erro_consolidado as number))),
          "Maior erro entre as fontes (média)": r1(mean(rows.map((e) =>
            Math.max(e.erro_open_meteo as number, e.erro_weather_api as number)))),
        };
      }).filter((r) => r.N > 0),
    );
    const rain = errors.filter((e) => e.variavel === "precipitationMm");
    const rainHits = (src: "open_meteo" | "weather_api" | "consolidado") => {
      const ok = rain.filter((e) => ((e[src] as number) >= RAIN_MM) === ((e.observado as number) >= RAIN_MM));
      return r1((100 * ok.length) / (rain.length || 1));
    };
    const rainTable = [{
      "Dias avaliados": rain.length,
      "Dias com chuva observada (>= 1 mm)": rain.filter((e) => (e.observado as number) >= RAIN_MM).length,
      "Acerto chove/não chove Open-Meteo %": rainHits("open_meteo"),
      "Acerto WeatherAPI %": rainHits("weather_api"),
      "Acerto consolidado %": rainHits("consolidado"),
    }];
    console.log("\n2) Erro em relação ao observado (reanálise ERA5)");
    console.table(errTable);
    console.log("Erro conforme o nível de concordância");
    console.table(byAgreement);
    console.log("Chuva: acerto de 'chove / não chove'");
    console.table(rainTable);
    Object.assign(summary, { errTable, byAgreement, rainTable });
  }
  writeFileSync(join(OUT_DIR, "resumo.json"), JSON.stringify(summary, null, 2));
  console.log(`\nArquivos em ${OUT_DIR}: comparacoes.csv, dias.csv, erros.csv e resumo.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
