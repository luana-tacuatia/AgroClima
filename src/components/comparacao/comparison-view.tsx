"use client";

import { useState } from "react";

import { AgreementBadge } from "@/components/comparacao/agreement-badge";
import { AgreementGuide } from "@/components/comparacao/agreement-guide";
import { ForecastComparisonChart } from "@/components/comparacao/forecast-comparison-chart";
import { METRIC_KEYS, compareAlignedDays } from "@/lib/weather/compare";
import { cn } from "@/lib/utils";
import type { DailyComparison, MetricComparison, MetricKey } from "@/types/comparison";
import type { ForecastResponse } from "@/types/forecast";

const METRICS: Record<MetricKey, { label: string; unit: string; decimals: number; hint: string }> = {
  temperatureMinC: { label: "Temperatura mínima", unit: "°C", decimals: 1, hint: "Risco de geada e frio" },
  temperatureMaxC: { label: "Temperatura máxima", unit: "°C", decimals: 1, hint: "Calor e demanda de água" },
  humidityPercent: { label: "Umidade relativa", unit: "%", decimals: 0, hint: "Doenças e pulverização" },
  precipitationMm: { label: "Chuva prevista", unit: "mm", decimals: 1, hint: "Irrigação e colheita" },
  precipitationProbabilityPercent: {
    label: "Chance de chuva",
    unit: "%",
    decimals: 0,
    hint: "Planejamento do dia",
  },
  windSpeedMaxKmh: { label: "Vento máximo", unit: "km/h", decimals: 1, hint: "Aplicação de defensivos" },
};

const SOURCE_A = { name: "Open-Meteo", color: "#2a78d6" };
const SOURCE_B = { name: "WeatherAPI.com", color: "#eb6834" };

function formatNumber(value: number | null, decimals: number): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDayLabel(isoDate: string): { weekday: string; day: string } {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    day: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
  };
}

function summary(day: DailyComparison): string {
  const low = METRIC_KEYS.filter((key) => day.metrics[key].agreement === "low").map((key) =>
    METRICS[key].label.toLowerCase(),
  );
  if (day.overallAgreement === "unavailable") return "Apenas uma fonte disponível: não é possível comparar.";
  if (low.length === 0) return "As fontes estão próximas em todas as variáveis.";
  const affected = METRIC_KEYS.filter((key) => day.metrics[key].agreement === "low").map((key) =>
    METRICS[key].hint.toLowerCase(),
  );
  return `As fontes divergem em: ${low.join(", ")}. Isso afeta decisões como: ${affected.join("; ")}. Confira o valor de cada fonte e consulte de novo mais perto da data.`;
}

function MetricCard({ metricKey, metric }: { metricKey: MetricKey; metric: MetricComparison }) {
  const info = METRICS[metricKey];
  const max = Math.max(Math.abs(metric.sourceA ?? 0), Math.abs(metric.sourceB ?? 0), 1);
  const rows = [
    { ...SOURCE_A, value: metric.sourceA },
    { ...SOURCE_B, value: metric.sourceB },
  ];

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{info.label}</h3>
          <p className="text-xs text-slate-500">{info.hint}</p>
        </div>
        <AgreementBadge level={metric.agreement} compact />
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {formatNumber(metric.consolidated, info.decimals)}
        <span className="ml-1 text-base font-normal text-slate-500">{info.unit}</span>
      </p>
      <p className="text-xs text-slate-500">
        {metric.agreement === "unavailable" ? "Valor de uma única fonte" : "Valor consolidado (média das fontes)"}
      </p>

      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-xs">
            <dt className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
              {row.name}
            </dt>
            <dd className="font-medium text-slate-900">
              {formatNumber(row.value, info.decimals)} {row.value !== null && info.unit}
            </dd>
            {/* Barra apenas visual: o valor já está no texto acima. */}
            <dd className="col-span-2 mt-1 h-1.5 w-full rounded-full bg-slate-100" aria-hidden>
              {row.value !== null && (
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.max((Math.abs(row.value) / max) * 100, 2)}%`,
                    backgroundColor: row.color,
                  }}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {metric.percentageDivergence !== null && (
        <p className="mt-3 text-xs text-slate-500">
          Diferença de {formatNumber(metric.absoluteDifference, info.decimals)} {info.unit} (
          {formatNumber(metric.percentageDivergence, 1)}% de divergência)
        </p>
      )}
    </article>
  );
}

export function ComparisonView({ data }: { data: ForecastResponse }) {
  const days = compareAlignedDays(data.days);
  const [selected, setSelected] = useState(0);
  const day = days[Math.min(selected, days.length - 1)];

  if (!day) {
    return (
      <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        Não há dados comparáveis para esta localidade no momento.
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Dias da previsão">
        {days.map((d, index) => {
          const { weekday, day: label } = formatDayLabel(d.date);
          const active = index === selected;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(index)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span className={cn("block text-xs uppercase tracking-wide", active ? "opacity-80" : "opacity-70")}>
                {index === 0 ? "hoje" : weekday}
              </span>
              <span className="block text-lg font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Resumo do dia</h2>
          <AgreementBadge level={day.overallAgreement} />
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{summary(day)}</p>
      </div>

      <AgreementGuide />

      <ForecastComparisonChart days={days} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_KEYS.map((key) => (
          <MetricCard key={key} metricKey={key} metric={day.metrics[key]} />
        ))}
      </div>
    </section>
  );
}
