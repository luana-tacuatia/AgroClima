// Regras de consolidação, divergência e concordância (PROJECT.md, seção 9 — Fase 4).
// Funções puras: não dependem de rede, banco de dados nem interface.

import type { AlignedForecastDay, DailyForecast } from "@/types/forecast";
import type {
  AgreementLevel,
  DailyComparison,
  MetricComparison,
  MetricKey,
} from "@/types/comparison";

export const METRIC_KEYS: MetricKey[] = [
  "temperatureMinC",
  "temperatureMaxC",
  "humidityPercent",
  "precipitationMm",
  "precipitationProbabilityPercent",
  "windSpeedMaxKmh",
];

// Faixas internas do protótipo (não são uma classificação meteorológica oficial).
export const HIGH_AGREEMENT_MAX = 10; // até 10%: alta
export const MEDIUM_AGREEMENT_MAX = 25; // acima de 10% até 25%: média

// Tolerância absoluta para valores próximos de zero (ajuste após a primeira aplicação,
// 28/09/2026): com 1,0 mm × 0,0 mm de chuva ou 4% × 6% de chance de chuva, a divergência
// percentual passava de 25% ("baixa"), embora as duas fontes indicassem ausência de chuva
// relevante. Se a diferença absoluta não passar destes limites, a concordância é "alta",
// independentemente do percentual. Limiares provisórios, a ajustar em novas aplicações.
export const ABSOLUTE_TOLERANCE: Partial<Record<MetricKey, number>> = {
  precipitationMm: 1, // até 1 mm de diferença
  precipitationProbabilityPercent: 10, // até 10 pontos percentuais
};

const AGREEMENT_POINTS: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Divergência percentual simétrica: |A − B| / ((|A| + |B|) / 2) × 100. */
export function percentageDivergence(a: number, b: number): number {
  const base = (Math.abs(a) + Math.abs(b)) / 2;
  if (base === 0) return 0; // ambos iguais a zero
  return (Math.abs(a - b) / base) * 100;
}

export function agreementFromDivergence(divergence: number): AgreementLevel {
  if (divergence <= HIGH_AGREEMENT_MAX) return "high";
  if (divergence <= MEDIUM_AGREEMENT_MAX) return "medium";
  return "low";
}

/**
 * Compara uma métrica das duas fontes. Ausência de dado nunca é tratada como zero.
 * Quando `key` é informada e a métrica tem tolerância absoluta, uma diferença pequena
 * resulta em concordância alta mesmo que o percentual seja elevado.
 */
export function compareMetric(a: number | null, b: number | null, key?: MetricKey): MetricComparison {
  if (a === null || b === null) {
    return {
      sourceA: a,
      sourceB: b,
      consolidated: a ?? b, // valor de uma única fonte, sem concordância
      absoluteDifference: null,
      percentageDivergence: null,
      agreement: "unavailable",
    };
  }
  const divergence = percentageDivergence(a, b);
  const absoluteDifference = Math.abs(a - b);
  const tolerance = key ? ABSOLUTE_TOLERANCE[key] : undefined;
  const withinTolerance = tolerance !== undefined && absoluteDifference <= tolerance;
  return {
    sourceA: a,
    sourceB: b,
    consolidated: (a + b) / 2,
    absoluteDifference,
    percentageDivergence: divergence,
    agreement: withinTolerance ? "high" : agreementFromDivergence(divergence),
  };
}

/** Concordância geral do dia: média dos pontos das métricas comparáveis. */
export function overallAgreement(levels: AgreementLevel[]): AgreementLevel {
  const points = levels
    .filter((level): level is "high" | "medium" | "low" => level !== "unavailable")
    .map((level) => AGREEMENT_POINTS[level]);
  if (points.length === 0) return "unavailable";
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
  if (mean >= 2.5) return "high";
  if (mean >= 1.75) return "medium";
  return "low";
}

/** Compara um dia a partir das previsões de cada fonte (qualquer uma pode estar ausente). */
export function compareDay(
  date: string,
  sourceA: DailyForecast | undefined,
  sourceB: DailyForecast | undefined,
): DailyComparison {
  const metrics = {} as Record<MetricKey, MetricComparison>;
  for (const key of METRIC_KEYS) {
    metrics[key] = compareMetric(sourceA?.[key] ?? null, sourceB?.[key] ?? null, key);
  }
  return {
    date,
    metrics,
    overallAgreement: overallAgreement(METRIC_KEYS.map((key) => metrics[key].agreement)),
  };
}

/** Compara os dias já alinhados pela rota /api/forecast (Open-Meteo = A, WeatherAPI.com = B). */
export function compareAlignedDays(days: AlignedForecastDay[]): DailyComparison[] {
  return days.map((day) =>
    compareDay(day.date, day.bySource["open-meteo"], day.bySource["weather-api"]),
  );
}
