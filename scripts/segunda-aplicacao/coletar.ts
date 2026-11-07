// Segunda aplicação do protótipo — COLETA DIÁRIA.
// Consulta a Open-Meteo e a WeatherAPI.com para as cidades dos polos do grupo e salva as
// previsões (já no modelo interno DailyForecast) com a data e a hora da consulta.
//
// Executar uma vez por dia, de preferência sempre no mesmo horário, na raiz do projeto:
//   npx tsx scripts/segunda-aplicacao/coletar.ts
//
// Requer WEATHER_API_KEY no arquivo .env.local (o mesmo usado pelo `npm run dev`).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { compareDay } from "@/lib/weather/compare";
import { fetchOpenMeteoForecast } from "@/lib/weather/providers/open-meteo";
import { searchLocations } from "@/lib/weather/providers/open-meteo-geocoding";
import { fetchWeatherApiForecast } from "@/lib/weather/providers/weather-api";
import type { AgreementLevel } from "@/types/comparison";
import type { DailyForecast } from "@/types/forecast";

const ROOT = process.cwd();
const DIR = join(ROOT, "scripts", "segunda-aplicacao");
const DATA_DIR = join(DIR, "dados");
const CITIES_FILE = join(DIR, "cidades.json");

// Cidades dos polos do grupo (todas no estado de São Paulo).
const CITY_NAMES = [
  "Campinas",
  "Limeira",
  "Mogi Mirim",
  "Monte Mor",
  "Pedreira",
  "Santa Bárbara d'Oeste",
  "Serra Negra",
  "Socorro",
];

export interface City {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

export interface Collection {
  city: City;
  collectedAt: string; // ISO, horário da consulta
  collectionDate: string; // AAAA-MM-DD no horário de Brasília
  openMeteo: DailyForecast[] | null;
  weatherApi: DailyForecast[] | null;
  errors: Record<string, string>;
}

/** Carrega .env.local sem dependências (o tsx não lê esse arquivo sozinho). */
function loadEnvLocal() {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Data local (America/Sao_Paulo) no formato AAAA-MM-DD. */
export function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

/**
 * Coordenadas das cidades: geocodificadas na primeira execução e salvas em cidades.json,
 * para que todas as coletas usem exatamente os mesmos pontos.
 */
async function loadCities(): Promise<City[]> {
  if (existsSync(CITIES_FILE)) return JSON.parse(readFileSync(CITIES_FILE, "utf-8"));
  const cities: City[] = [];
  for (const name of CITY_NAMES) {
    const results = await searchLocations(name);
    const match = results.find(
      (r) => r.state === "São Paulo" && (r.country === "Brasil" || r.country === "Brazil"),
    );
    if (!match) throw new Error(`Cidade não encontrada no estado de São Paulo: ${name}`);
    cities.push({ name, slug: slugify(name), latitude: match.latitude, longitude: match.longitude });
  }
  writeFileSync(CITIES_FILE, JSON.stringify(cities, null, 2));
  console.log(`Coordenadas salvas em ${CITIES_FILE}`);
  return cities;
}

const PT: Record<AgreementLevel, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  unavailable: "—",
};

async function main() {
  loadEnvLocal();
  if (!process.env.WEATHER_API_KEY) {
    console.error("WEATHER_API_KEY não encontrada. Confira o arquivo .env.local na raiz do projeto.");
    process.exit(1);
  }

  const cities = await loadCities();
  const now = new Date();
  const collectionDate = localDate(now);
  const outDir = join(DATA_DIR, collectionDate);
  if (existsSync(outDir)) {
    console.log(`Já existe coleta para ${collectionDate}; os arquivos serão substituídos.`);
  }
  mkdirSync(outDir, { recursive: true });

  const summary: Record<string, string>[] = [];
  let failures = 0;

  for (const city of cities) {
    const [om, wa] = await Promise.allSettled([
      fetchOpenMeteoForecast(city.latitude, city.longitude),
      fetchWeatherApiForecast(city.latitude, city.longitude),
    ]);
    const errors: Record<string, string> = {};
    if (om.status === "rejected") errors["open-meteo"] = String(om.reason?.message ?? om.reason);
    if (wa.status === "rejected") errors["weather-api"] = String(wa.reason?.message ?? wa.reason);
    if (Object.keys(errors).length) failures++;

    const collection: Collection = {
      city,
      collectedAt: now.toISOString(),
      collectionDate,
      openMeteo: om.status === "fulfilled" ? om.value : null,
      weatherApi: wa.status === "fulfilled" ? wa.value : null,
      errors,
    };
    writeFileSync(join(outDir, `${city.slug}.json`), JSON.stringify(collection, null, 2));

    const row: Record<string, string> = { Cidade: city.name };
    for (const dayA of collection.openMeteo ?? []) {
      const dayB = collection.weatherApi?.find((d) => d.date === dayA.date);
      row[dayA.date.slice(5).split("-").reverse().join("/")] = dayB
        ? PT[compareDay(dayA.date, dayA, dayB).overallAgreement]
        : "só 1 fonte";
    }
    if (Object.keys(errors).length) row.Erro = Object.values(errors).join(" | ");
    summary.push(row);
  }

  console.log(`\nColeta de ${collectionDate} (${now.toLocaleTimeString("pt-BR")}) — concordância geral por dia:`);
  console.table(summary);
  console.log(`Arquivos salvos em ${outDir}`);
  if (failures) console.log(`Atenção: ${failures} cidade(s) com falha em alguma fonte. Rode de novo mais tarde.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
