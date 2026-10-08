// Persistência do histórico no Supabase pela API REST (PostgREST), sem dependências extras.
// Se SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estiverem configuradas, o histórico
// fica desativado e a previsão continua funcionando normalmente.
// Para ativar, basta chamar saveForecastSnapshots na rota /api/forecast (ver docs/pagina-comparar.md).

import { getServerEnv } from "@/lib/env";
import type { DailyForecast } from "@/types/forecast";
import type { LocationData } from "@/types/location";

function getSupabaseConfig(): { url: string; key: string } | null {
  const env = getServerEnv();
  if (!env.hasSupabase || !env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  return { url: env.supabaseUrl.replace(/\/$/, ""), key: env.supabaseServiceRoleKey };
}

const TIMEOUT_MS = 8_000;

function headers(key: string, extra: Record<string, string> = {}): HeadersInit {
  const base: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
  return base;
}

export function isHistoryEnabled(): boolean {
  return getSupabaseConfig() !== null;
}

export async function saveForecastSnapshots(
  location: LocationData,
  forecasts: DailyForecast[],
): Promise<{ saved: boolean; reason?: string }> {
  const config = getSupabaseConfig();
  if (!config) return { saved: false, reason: "Histórico desativado (Supabase não configurado)" };
  if (forecasts.length === 0) return { saved: false, reason: "Nenhuma previsão para salvar" };

  try {
    const locationResponse = await fetch(
      `${config.url}/rest/v1/locations?on_conflict=latitude,longitude`,
      {
        method: "POST",
        headers: headers(config.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({
          name: location.name,
          state: location.state ?? null,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!locationResponse.ok) throw new Error(`locations: status ${locationResponse.status}`);
    const [savedLocation] = (await locationResponse.json()) as { id: number }[];

    const rows = forecasts.map((f) => ({
      location_id: savedLocation.id,
      source: f.source,
      forecast_date: f.date,
      temperature_min_c: f.temperatureMinC,
      temperature_max_c: f.temperatureMaxC,
      humidity_percent: f.humidityPercent,
      precipitation_mm: f.precipitationMm,
      precipitation_probability_percent: f.precipitationProbabilityPercent,
      wind_speed_max_kmh: f.windSpeedMaxKmh,
    }));

    const snapshotResponse = await fetch(`${config.url}/rest/v1/forecast_snapshots`, {
      method: "POST",
      headers: headers(config.key, { Prefer: "return=minimal" }),
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!snapshotResponse.ok) throw new Error(`forecast_snapshots: status ${snapshotResponse.status}`);

    return { saved: true };
  } catch (error) {
    // Falha de persistência não pode impedir a exibição da previsão (PROJECT.md, seção 4).
    console.error("Falha ao salvar histórico no Supabase:", error);
    return { saved: false, reason: "Não foi possível salvar o histórico" };
  }
}

export interface HistorySnapshot {
  source: string;
  forecast_date: string;
  collected_at: string;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
  humidity_percent: number | null;
  precipitation_mm: number | null;
  precipitation_probability_percent: number | null;
  wind_speed_max_kmh: number | null;
}

export async function getRecentSnapshots(
  latitude: number,
  longitude: number,
  limit: number,
): Promise<HistorySnapshot[] | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    select:
      "source,forecast_date,collected_at,temperature_min_c,temperature_max_c,humidity_percent," +
      "precipitation_mm,precipitation_probability_percent,wind_speed_max_kmh,locations!inner(latitude,longitude)",
    "locations.latitude": `eq.${latitude}`,
    "locations.longitude": `eq.${longitude}`,
    order: "collected_at.desc",
    limit: String(limit),
  });

  const response = await fetch(`${config.url}/rest/v1/forecast_snapshots?${params}`, {
    headers: headers(config.key),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase respondeu com status ${response.status}`);

  const rows = (await response.json()) as (HistorySnapshot & { locations?: unknown })[];
  return rows.map(({ locations: _locations, ...row }) => {
    void _locations; // campo usado só para o filtro
    return row;
  });
}
