import { CloudSun } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/70 bg-white/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <CloudSun className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            Dados:{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Open-Meteo
            </a>{" "}
            (CC BY 4.0) e{" "}
            <a
              href="https://www.weatherapi.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Powered by WeatherAPI.com
            </a>
          </span>
        </p>
        <p className="text-xs leading-5 text-slate-500">
          Projeto acadêmico Univesp · Previsões de 3 dias · Não substitui alertas
          meteorológicos oficiais.
        </p>
      </div>
    </footer>
  );
}
