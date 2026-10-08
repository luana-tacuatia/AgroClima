"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Scale, ShieldCheck } from "lucide-react";

import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SearchCard } from "@/components/location/search-card";
import { ForecastPanel } from "@/components/weather/forecast-panel";
import { getLastLocation, saveLastLocation } from "@/lib/location-storage";
import type { LocationResult } from "@/schemas/location";
import type { ForecastResponse } from "@/types/forecast";
import type { SelectedLocation } from "@/types/location";

const HIGHLIGHTS = [
  {
    icon: Scale,
    title: "Duas fontes, lado a lado",
    description: "Open-Meteo e WeatherAPI.com consultadas em paralelo para a mesma data.",
  },
  {
    icon: BarChart3,
    title: "Consolidação explicável",
    description: "Média, divergência e concordância em números simples de entender.",
  },
  {
    icon: ShieldCheck,
    title: "Pensado para o campo",
    description: "Interface mobile-first para apoiar decisões de plantio e irrigação.",
  },
] as const;

export default function Home() {
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadForecast = useCallback(async (location: SelectedLocation) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setForecast(null);

    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      name: location.name,
    });
    if (location.state) params.set("state", location.state);
    if (location.country) params.set("country", location.country);

    try {
      const response = await fetch(`/api/forecast?${params.toString()}`);
      const data = (await response.json()) as ForecastResponse;
      if (requestId !== requestIdRef.current) return;
      setForecast(data);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(
        "Não foi possível carregar a previsão. Verifique sua conexão e tente novamente."
      );
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
      void loadForecast(normalized);
    },
    [loadForecast]
  );

  // Restaura a última localidade persistida (após o mount, sem mismatch de hidratação).
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const last = getLastLocation();
      if (last) {
        setSelected(last);
        void loadForecast(last);
      }
    });
    return () => {
      active = false;
    };
  }, [loadForecast]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />

      <main className="flex-1">
        {/* Faixa de destaque */}
        <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                AgroClima · projeto acadêmico Univesp
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Compare duas fontes de previsão e tome decisão com mais segurança.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                O AgroClima consulta a Open-Meteo e a WeatherAPI.com para a mesma
                cidade, mostra o valor consolidado de cada dia e indica o quanto as
                fontes concordam — em uma leitura simples, pensada para o celular.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/comparar"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  Comparar previsões
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <span className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600">
                  Fontes: Open-Meteo + WeatherAPI.com
                </span>
              </div>
            </div>

            <div className="grid content-center gap-3">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
                  >
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Busca + previsão (mesma largura da página /comparar) */}
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex w-full flex-col gap-4">
            <SearchCard
              title="Buscar previsão"
              subtitle="Informe a cidade ou use a localização do dispositivo."
              selected={selected}
              isLoading={isLoading}
              onSelect={handleSelect}
            />

            {forecast && (
              <Link
                href="/comparar"
                className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                Ver comparação detalhada com concordância
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>

          <div className="mt-6 w-full">
            {selected ? (
              <ForecastPanel forecast={forecast} isLoading={isLoading} error={error} />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
                <span className="rounded-2xl bg-slate-100 p-3 text-slate-400">
                  <BarChart3 className="h-7 w-7" aria-hidden />
                </span>
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  Busque uma cidade ou use sua localização para ver a previsão dos
                  próximos 3 dias, com os valores de cada fonte.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
