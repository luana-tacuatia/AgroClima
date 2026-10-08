import type { Metadata } from "next";

import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbar } from "@/components/layout/app-navbar";
import { HistoryClient } from "@/components/historico/history-client";
import type { SelectedLocation } from "@/types/location";

export const metadata: Metadata = {
  title: "Histórico de consultas",
  description:
    "Consultas recentes de previsão registradas pelo AgroClima para cada localidade.",
};

interface HistoricoSearchParams {
  lat?: string | string[];
  lon?: string | string[];
  name?: string | string[];
  state?: string | string[];
  country?: string | string[];
}

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<HistoricoSearchParams>;
}) {
  const params = await searchParams;

  const lat = Number(toSingle(params.lat));
  const lon = Number(toSingle(params.lon));
  const hasValidCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  const initialLocation: SelectedLocation | null = hasValidCoords
    ? {
        name: toSingle(params.name) ?? "Localidade",
        state: toSingle(params.state) ?? null,
        country: toSingle(params.country) ?? null,
        latitude: lat,
        longitude: lon,
        timezone: null,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />

      <main className="flex-1">
        <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Histórico
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Histórico de consultas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Cada consulta de previsão gera um registro com os valores salvos de cada fonte.
              Use para acompanhar como as previsões mudam ao longo do tempo.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <HistoryClient initialLocation={initialLocation} />
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
