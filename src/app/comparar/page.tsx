import type { Metadata } from "next";

import { AppFooter } from "@/components/layout/app-footer";
import { AppNavbar } from "@/components/layout/app-navbar";
import { CompararClient } from "@/components/comparacao/comparar-client";

export const metadata: Metadata = {
  title: "Comparar previsões",
  description: "Compare as previsões da Open-Meteo e da WeatherAPI.com para os próximos três dias.",
};

export default function CompararPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />

      <main className="flex-1">
        <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Comparação entre fontes
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Comparar previsões
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Para a mesma cidade e data, veja o valor de cada fonte, o valor
              consolidado e o indicador de concordância nos próximos 3 dias.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <CompararClient />

          <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-5 text-sm leading-6 text-slate-600 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Como ler o indicador de concordância
            </h2>
            <p className="mt-2">
              Para cada variável, o AgroClima calcula a média entre as fontes (valor
              consolidado) e a divergência percentual entre elas. Até 10% de
              divergência, a concordância é alta; acima de 10% até 25%, média; acima de
              25%, baixa. Para a chuva, diferenças de até 1 mm ou de até 10 pontos na
              chance de chuva contam como alta concordância, porque com valores muito
              pequenos o percentual fica exagerado. Essas faixas são parâmetros do protótipo e não uma
              classificação meteorológica oficial. Concordância alta não garante que a
              previsão vai se confirmar, e o AgroClima não substitui alertas oficiais
              nem orientação agronômica.
            </p>
          </section>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
