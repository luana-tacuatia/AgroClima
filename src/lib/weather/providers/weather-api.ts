import { getServerEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/http";
import type { DailyForecast } from "@/types/forecast";
import { FORECAST_DAYS, PROVIDER_TIMEOUT_MS } from "@/lib/weather/constants";

const WEATHER_API_FORECAST_URL = "https://api.weatherapi.com/v1/forecast.json";

/** Erro específico para a chave ausente: a UI exibe mensagem amigável. */
export class WeatherApiKeyMissingError extends Error {
  constructor() {
    super("WEATHER_API_KEY não configurada no servidor.");
    this.name = "WeatherApiKeyMissingError";
  }
}

interface WeatherApiCondition {
  text?: string;
  icon?: string;
  code?: number;
}

interface WeatherApiDayResponse {
  date?: string;
  day?: {
    mintemp_c?: number;
    maxtemp_c?: number;
    avghumidity?: number;
    totalprecip_mm?: number;
    daily_chance_of_rain?: number;
    maxwind_kph?: number;
    condition?: WeatherApiCondition;
  };
}

interface WeatherApiResponse {
  error?: { code?: number; message?: string };
  forecast?: { forecastday?: WeatherApiDayResponse[] };
}

/**
 * Mensagens em português para os códigos de erro documentados da WeatherAPI.com
 * (https://www.weatherapi.com/docs/, seção "Error Codes"). Códigos não mapeados
 * recebem uma mensagem genérica com o código, sem expor detalhes da conta.
 */
const WEATHER_API_ERROR_MESSAGES: Record<number, string> = {
  1002: "Chave da WeatherAPI não informada na consulta.",
  1003: "Localidade não informada na consulta à WeatherAPI.",
  1005: "Endereço de consulta da WeatherAPI inválido.",
  1006: "A WeatherAPI não encontrou previsão para esta localidade.",
  2006: "Chave da WeatherAPI inválida.",
  2007: "Limite mensal de consultas da WeatherAPI atingido. Tente novamente no próximo mês.",
  2008: "Chave da WeatherAPI desativada.",
  2009: "O plano da WeatherAPI não dá acesso a este recurso.",
  9999: "Erro interno da WeatherAPI. Tente novamente em alguns minutos.",
};

export function weatherApiErrorMessage(code: number | undefined, httpStatus?: number): string {
  if (code !== undefined && WEATHER_API_ERROR_MESSAGES[code]) {
    return WEATHER_API_ERROR_MESSAGES[code];
  }
  if (code !== undefined) return `A WeatherAPI retornou um erro (código ${code}).`;
  if (httpStatus !== undefined) return `A WeatherAPI respondeu com o status HTTP ${httpStatus}.`;
  return "Erro desconhecido retornado pela WeatherAPI.";
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Consulta a WeatherAPI.com (unidades métricas) por coordenadas.
 * A chave existe apenas no servidor e nunca é logada.
 *
 * Campos diários conforme a documentação (forecastday[].day): mintemp_c, maxtemp_c,
 * avghumidity, totalprecip_mm, daily_chance_of_rain e maxwind_kph.
 */
export async function fetchWeatherApiForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
  const { weatherApiKey } = getServerEnv();
  if (!weatherApiKey) {
    throw new WeatherApiKeyMissingError();
  }

  const params = new URLSearchParams({
    key: weatherApiKey,
    q: `${latitude},${longitude}`,
    days: String(FORECAST_DAYS),
    aqi: "no",
    alerts: "no",
  });

  const response = await fetchWithTimeout(`${WEATHER_API_FORECAST_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    timeoutMs: PROVIDER_TIMEOUT_MS,
  });

  const data = (await response.json().catch(() => null)) as WeatherApiResponse | null;

  if (!response.ok || !data) {
    // Erros 4xx/5xx: traduz o código documentado da API para uma mensagem em português.
    throw new Error(weatherApiErrorMessage(data?.error?.code, response.status));
  }

  if (data.error) {
    throw new Error(weatherApiErrorMessage(data.error.code));
  }

  const days: DailyForecast[] = [];

  for (const entry of data.forecast?.forecastday ?? []) {
    if (!entry.date) continue;
    const condition = entry.day?.condition;
    days.push({
      source: "weather-api",
      date: entry.date,
      temperatureMinC: toNumberOrNull(entry.day?.mintemp_c),
      temperatureMaxC: toNumberOrNull(entry.day?.maxtemp_c),
      humidityPercent: toNumberOrNull(entry.day?.avghumidity),
      precipitationMm: toNumberOrNull(entry.day?.totalprecip_mm),
      precipitationProbabilityPercent: toNumberOrNull(entry.day?.daily_chance_of_rain),
      windSpeedMaxKmh: toNumberOrNull(entry.day?.maxwind_kph),
      conditionCode: condition?.code != null ? String(condition.code) : null,
      conditionLabel: condition?.text ?? null,
    });
  }

  if (days.length === 0) {
    throw new Error("WeatherAPI não retornou dias de previsão.");
  }

  return days;
}
