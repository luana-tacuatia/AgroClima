"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarClock, Database, Loader2, RefreshCw } from "lucide-react";

import { SearchCard } from "@/components/location/search-card";
import { getLastLocation, saveLastLocation } from "@/lib/location-storage";
import type { HistorySnapshot } from "@/lib/supabase/history";
import type { LocationResult } from "@/schemas/location";
import { cn } from "@/lib/utils";
import type { SelectedLocation } from "@/types/location";

interface HistoryResponse {
  enabled: boolean;
  snapshots: HistorySnapshot[];
  detail?: string;
}

interface HistoryGroup {
  collectedAt: string;
  snapshots: HistorySnapshot[];
}

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  "open-meteo": { label: "Open-Meteo", className: "bg-sky-100 text-sky-800" },
  "weather-api": { label: "WeatherAPI.com", className: "bg-orange-100 text-orange-800" },
};

function sourceStyle(source: string) {
  return SOURCE_STYLES[source] ?? { label: source, className: "bg-slate-100 text-slate-700" };
}

function formatCollectedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatForecastDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(year, month - 1, day)
  );
}

function formatMetric(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Agrupa snapshots pelo collected_at: cada grupo representa uma consulta salva. */
function groupByCollection(snapshots: HistorySnapshot[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  for (const snapshot of snapshots) {
    const last = groups[groups.length - 1];
    if (last && last.collectedAt === snapshot.collected_at) {
      last.snapshots.push(snapshot);
    } else {
      groups.push({ collectedAt: snapshot.collected_at, snapshots: [snapshot] });
    }
  }
  return groups;
}

interface HistoryClientProps {
  initialLocation: SelectedLocation | null;
}

export function HistoryClient({ initialLocation }: HistoryClientProps) {
  const [selected, setSelected] = useState<SelectedLocation | null>(initialLocation);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const didInitialLoad = useRef(false);

  const loadHistory = useCallback(async (location: SelectedLocation) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setData(null);
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      limit: "60",
    });
    try {
      const response = await fetch(`/api/history?${params.toString()}`);
      const result = (await response.json()) as HistoryResponse;
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        setError(result.detail ?? "Não foi possível consultar o histórico.");
      } else {
        setData(result);
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Não foi possível carregar o histórico. Verifique sua conexão.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (location: LocationResult | SelectedLocation) => {
      const normalized: SelectedLocation = {
        name: location.name,
        state: location.state ?? null,
        country: location.country ?? null,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone ?? null,
      };
      saveLastLocation(normalized);
      setSelected(normalized);
      void loadHistory(normalized);
    },
    [loadHistory]
  );

  // Carrega no mount: localidade da URL (se vier) ou a última salva em localStorage.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || didInitialLoad.current) return;
      didInitialLoad.current = true;
      if (selected) {
        void loadHistory(selected);
      } else {
        const last = getLastLocation();
        if (last) {
          setSelected(last);
          void loadHistory(last);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [selected, loadHistory]);

  const groups = data?.snapshots ? groupByCollection(data.snapshots) : [];

  return (
    <div className="space-y-6">
      <SearchCard
        title="Ver histórico de outra localidade"
        subtitle="As consultas aparecem aqui automaticamente ao buscar uma previsão."
        selected={selected}
        isLoading={isLoading}
        onSelect={handleSelect}
      />

      {selected && data && !isLoading && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {groups.length > 0
              ? `${groups.length} consulta${groups.length === 1 ? "" : "s"} registrada${groups.length === 1 ? "" : "s"}`
              : "Sem consultas registradas"}
          </p>
          <button
            type="button"
            onClick={() => void loadHistory(selected)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Atualizar
          </button>
        </div>
      )}

      {!selected && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <CalendarClock className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Busque uma cidade para ver as consultas registradas para ela.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Carregando histórico…
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Falha ao consultar o histórico</p>
            <p className="mt-1 text-sm leading-6">
              {error}
              <span className="mt-1 block text-xs text-rose-700">
                Verifique se o banco está configurado (execute <code>supabase/schema.sql</code> no SQL
                Editor do Supabase) e se as variáveis SUPABASE_URL e a chave secreta estão no <code>.env</code>.
              </span>
            </p>
          </div>
        </div>
      )}

      {data && !data.enabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <p className="text-sm leading-6">
            Histórico desativado. Para registrar consultas, configure <code>SUPABASE_URL</code> e a chave
            secreta do Supabase (<code>SUPABASE_SERVICE_ROLE_KEY</code> ou{" "}
            <code>SUPABASE_SECRET_KEY</code>) no arquivo <code>.env</code>.
          </p>
        </div>
      )}

      {data?.enabled && !isLoading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <CalendarClock className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Nenhuma consulta registrada para esta localidade ainda. Ao buscar uma previsão, o registro
            fica salvo aqui automaticamente.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <section
            key={group.collectedAt}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <header className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-emerald-600" aria-hidden />
              <h2 className="text-sm font-semibold text-slate-900">
                Consulta de {formatCollectedAt(group.collectedAt)}
              </h2>
            </header>
            <ul className="mt-3 divide-y divide-slate-100">
              {group.snapshots.map((snapshot) => {
                const style = sourceStyle(snapshot.source);
                return (
                  <li
                    key={`${snapshot.source}-${snapshot.forecast_date}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
                  >
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        style.className
                      )}
                    >
                      {style.label}
                    </span>
                    <span className="text-xs text-slate-500">previsão {formatForecastDate(snapshot.forecast_date)}</span>
                    <span className="ml-auto text-xs text-slate-600 tabular-nums">
                      mín {formatMetric(snapshot.temperature_min_c)}°C · máx {formatMetric(snapshot.temperature_max_c)}°C
                      {" · "}umidade {formatMetric(snapshot.humidity_percent)}%
                      {" · "}chuva {formatMetric(snapshot.precipitation_mm)} mm
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
