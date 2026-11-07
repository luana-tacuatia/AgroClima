import { Info } from "lucide-react";

import { AgreementBadge } from "@/components/comparacao/agreement-badge";

/**
 * Explica, em linguagem simples, o que cada nível de concordância significa
 * para a decisão do produtor. Os limites seguem `src/lib/weather/compare.ts`.
 */
export function AgreementGuide() {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-900">
        <Info className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        Como ler a concordância
        <span className="ml-auto text-xs font-normal text-slate-500 group-open:hidden">mostrar</span>
        <span className="ml-auto hidden text-xs font-normal text-slate-500 group-open:inline">ocultar</span>
      </summary>
      <ul className="mt-3 space-y-3">
        <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <AgreementBadge level="high" compact />
          <span>
            As duas fontes indicam quase o mesmo valor (diferença de até 10%, ou chuva com até 1 mm ou 10
            pontos de chance de diferença). A previsão é mais confiável para planejar.
          </span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <AgreementBadge level="medium" compact />
          <span>
            Diferença entre 10% e 25%. Use o valor consolidado, mas acompanhe a previsão antes de decidir.
          </span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <AgreementBadge level="low" compact />
          <span>
            As fontes discordam bastante (acima de 25%). Antes de irrigar, aplicar defensivos ou colher,
            confira o valor de cada fonte e consulte de novo mais perto da data.
          </span>
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Concordância não garante acerto: indica apenas se as fontes estão de acordo entre si.
      </p>
    </details>
  );
}
