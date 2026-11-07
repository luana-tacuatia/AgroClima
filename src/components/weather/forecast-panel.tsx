import { AlertTriangle, CheckCircle2, CloudSun, Loader2, XCircle } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/weather/constants";
import { cn } from "@/lib/utils";
import type {
  AlignedForecastDay,
  DailyForecast,
  ForecastResponse,
  WeatherSource,
} from "@/types/forecast";

const SOURCE_ORDER: WeatherSource[] = ["open-meteo", "weather-api"];

const SOURCE_ABBREVIATIONS: Record<WeatherSource, string> = {
  "open-meteo": "OM",
  "weather-api": "WA",
};

type MetricKey =
  | "temperatureMinC"
  | "temperatureMaxC"
  | "humidityPercent"
  | "precipitationMm"
  | "precipitationProbabilityPercent"
  | "windSpeedMaxKmh";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { key: "temperatureMinC", label: "Temp. mínima", unit: "°C" },
  { key: "temperatureMaxC", label: "Temp. máxima", unit: "°C" },
  { key: "humidityPercent", label: "Umidade", unit: "%" },
  { key: "precipitationMm", label: "Precipitação", unit: "mm" },
  { key: "precipitationProbabilityPercent", label: "Prob. de chuva", unit: "%" },
  { key: "windSpeedMaxKmh", label: "Vento máx.", unit: "km/h" },
];

/** Arredondamento permitido somente na camada de apresentação. */
function formatValue(value: number | null, unit: string): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("pt-BR")} ${unit}`;
}

function formatDayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  // Monta uma data local para o navegador não deslocar o dia pelo fuso.
  const localDate = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(localDate);
}

function DayCard({ day }: { day: AlignedForecastDay }) {
  const firstWithCondition = day.bySource["open-meteo"] ?? day.bySource["weather-api"];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize text-slate-900">
          {formatDayLabel(day.date)}
        </h3>
        {firstWithCondition?.conditionLabel && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CloudSun className="h-4 w-4 text-amber-500" />
            {firstWithCondition.conditionLabel}
          </span>
        )}
      </header>

      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {METRICS.map((metric) => (
          <div key={metric.key} className="rounded-2xl bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {metric.label}
            </dt>
            <dd className="mt-1.5 flex flex-col gap-0.5">
              {SOURCE_ORDER.map((sourceId) => {
                const value: number | null =
                  (day.bySource[sourceId] as DailyForecast | undefined)?.[metric.key] ?? null;
                return (
                  <span
                    key={sourceId}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span
                      className="text-[0.65rem] font-semibold uppercase text-slate-500"
                      title={SOURCE_LABELS[sourceId]}
                    >
                      {SOURCE_ABBREVIATIONS[sourceId]}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        value === null ? "text-slate-500" : "text-slate-900"
                      )}
                    >
                      {formatValue(value, metric.unit)}
                    </span>
                  </span>
                );
              })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface ForecastPanelProps {
  forecast: ForecastResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function ForecastPanel({ forecast, isLoading, error }: ForecastPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-8 text-center shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        <p className="text-sm text-slate-600">
          Consultando as duas fontes meteorológicas…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700"
      >
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Não foi possível carregar a previsão</p>
          <p className="mt-1 text-sm leading-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const okCount = SOURCE_ORDER.filter((sourceId) => forecast.sourceStatus[sourceId].status === "ok")
    .length;
  const isPartial = okCount === 1;
  const failedSource = isPartial
    ? SOURCE_ORDER.find((sourceId) => forecast.sourceStatus[sourceId].status === "error")
    : undefined;
  const failedMessage =
    failedSource && forecast.sourceStatus[failedSource].status === "error"
      ? forecast.sourceStatus[failedSource].message
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SOURCE_ORDER.map((sourceId) => {
          const status = forecast.sourceStatus[sourceId];
          const ok = status.status === "ok";
          return (
            <span
              key={sourceId}
              title={ok ? undefined : status.message}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {SOURCE_LABELS[sourceId]}: {ok ? `${status.days} dias` : "indisponível"}
            </span>
          );
        })}
      </div>

      {isPartial && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Apenas uma fonte respondeu. As métricas exibidas são da fonte disponível e a
          comparação entre fontes ficará indisponível para esta consulta.
          {failedSource && failedMessage ? (
            <span className="mt-1 block">
              {SOURCE_LABELS[failedSource]}: {failedMessage}
            </span>
          ) : null}
        </p>
      )}

      {forecast.days.length === 0 ? (
        <p className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm">
          Nenhuma previsão disponível para esta localidade.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {forecast.days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
