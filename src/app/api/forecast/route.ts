import { NextRequest, NextResponse } from "next/server";
import { alignForecastDays } from "@/lib/weather/normalize";
import { WEATHER_PROVIDERS, WEATHER_SOURCE_IDS, WeatherApiKeyMissingError } from "@/lib/weather/providers";
import { FORECAST_CACHE_TTL_MS } from "@/lib/weather/constants";
import { saveForecastSnapshots } from "@/lib/supabase/history";
import { forecastQuerySchema, type ForecastQuery } from "@/schemas/forecast";
import type { DailyForecast, ForecastResponse, SourceStatus, WeatherSource } from "@/types/forecast";

export const dynamic = "force-dynamic";

interface CacheEntry {
  expiresAt: number;
  response: ForecastResponse;
}

/** Cache em memória por localização (revalidação de ~30 min). */
const forecastCache = new Map<string, CacheEntry>();

function describeProviderError(reason: unknown): string {
  if (reason instanceof WeatherApiKeyMissingError) {
    return "Chave da WeatherAPI não configurada no servidor.";
  }
  if (reason instanceof Error && reason.name === "TimeoutError") {
    return "Tempo limite excedido ao consultar a fonte.";
  }
  // As mensagens dos providers são seguras para exibição (sem segredos).
  if (reason instanceof Error && reason.message) {
    return reason.message;
  }
  return "Erro desconhecido ao consultar a fonte.";
}

async function buildForecastResponse(query: ForecastQuery): Promise<ForecastResponse> {
  const settled = await Promise.allSettled(
    WEATHER_SOURCE_IDS.map((sourceId) =>
      WEATHER_PROVIDERS[sourceId].fetchDailyForecast(query.lat, query.lon)
    )
  );

  const sourceStatus = {} as Record<WeatherSource, SourceStatus>;
  const forecastsBySource: Partial<Record<WeatherSource, DailyForecast[]>> = {};

  settled.forEach((result, index) => {
    const sourceId = WEATHER_SOURCE_IDS[index];
    if (result.status === "fulfilled") {
      sourceStatus[sourceId] = { status: "ok", days: result.value.length };
      forecastsBySource[sourceId] = result.value;
    } else {
      sourceStatus[sourceId] = { status: "error", message: describeProviderError(result.reason) };
    }
  });

  return {
    location: {
      name: query.name ?? "Localidade",
      latitude: query.lat,
      longitude: query.lon,
    },
    sourceStatus,
    days: alignForecastDays(forecastsBySource),
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validation = forecastQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
    name: searchParams.get("name") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    country: searchParams.get("country") ?? undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { lat, lon, name, state, country } = validation.data;
  const key = `${lat.toFixed(4)}:${lon.toFixed(4)}:${name ?? ""}`;

  const cached = forecastCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...cached.response, cached: true });
  }

  const response = await buildForecastResponse({ lat, lon, name, state, country });

  const allFailed = WEATHER_SOURCE_IDS.every(
    (sourceId) => response.sourceStatus[sourceId].status === "error"
  );

  if (allFailed) {
    // Falha total não é em cache: a próxima tentativa pode recuperar.
    forecastCache.delete(key);
    return NextResponse.json(response, { status: 502 });
  }

  // Fase 6: salva o snapshot da consulta. A falha de persistência NÃO
  // impede a exibição da previsão (PROJECT.md, seção 4).
  const savedForecasts = response.days.flatMap((day) => Object.values(day.bySource));
  const history = await saveForecastSnapshots(
    {
      name: response.location.name,
      state: state ?? null,
      country: country ?? "BR",
      latitude: lat,
      longitude: lon,
    },
    savedForecasts,
  );

  forecastCache.set(key, {
    expiresAt: Date.now() + FORECAST_CACHE_TTL_MS,
    response,
  });

  return NextResponse.json({ ...response, history, cached: false });
}

