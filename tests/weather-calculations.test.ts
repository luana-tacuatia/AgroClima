import { describe, expect, it } from "vitest";

import {
  agreementFromDivergence,
  compareAlignedDays,
  compareDay,
  compareMetric,
  overallAgreement,
  percentageDivergence,
} from "@/lib/weather/compare";
import { alignForecastDays } from "@/lib/weather/normalize";
import { weatherApiErrorMessage } from "@/lib/weather/providers/weather-api";
import type { DailyForecast, WeatherSource } from "@/types/forecast";

function makeForecast(
  source: WeatherSource,
  date: string,
  overrides: Partial<DailyForecast> = {},
): DailyForecast {
  return {
    source,
    date,
    temperatureMinC: null,
    temperatureMaxC: null,
    humidityPercent: null,
    precipitationMm: null,
    precipitationProbabilityPercent: null,
    windSpeedMaxKmh: null,
    ...overrides,
  };
}

describe("percentageDivergence (divergência percentual simétrica)", () => {
  it("valores iguais resultam em 0%", () => {
    expect(percentageDivergence(20, 20)).toBe(0);
  });

  it("calcula |A-B| / ((|A|+|B|)/2) * 100", () => {
    // |10-20| = 10; média dos módulos = 15; 10/15*100 = 66,67%
    expect(percentageDivergence(10, 20)).toBeCloseTo(66.6667, 4);
  });

  it("ambos os valores iguais a zero: divergência 0% (regra especial)", () => {
    expect(percentageDivergence(0, 0)).toBe(0);
  });

  it("um valor igual a zero: usa a fórmula normalmente", () => {
    // |0-10| = 10; média dos módulos = 5; 10/5*100 = 200%
    expect(percentageDivergence(0, 10)).toBe(200);
    expect(percentageDivergence(12, 0)).toBe(200);
  });

  it("trata temperaturas negativas pelos módulos", () => {
    // |-10-10| = 20; média dos módulos = 10; 20/10*100 = 200%
    expect(percentageDivergence(-10, 10)).toBe(200);
    // |-5 - (-3)| = 2; média dos módulos = 4; 2/4*100 = 50%
    expect(percentageDivergence(-5, -3)).toBe(50);
  });
});

describe("agreementFromDivergence (limites de concordância)", () => {
  it("0% a 10%: alta concordância (10 incluso)", () => {
    expect(agreementFromDivergence(0)).toBe("high");
    expect(agreementFromDivergence(5)).toBe("high");
    expect(agreementFromDivergence(10)).toBe("high");
  });

  it("acima de 10% até 25%: média concordância (25 incluso)", () => {
    expect(agreementFromDivergence(10.01)).toBe("medium");
    expect(agreementFromDivergence(20)).toBe("medium");
    expect(agreementFromDivergence(25)).toBe("medium");
  });

  it("acima de 25%: baixa concordância", () => {
    expect(agreementFromDivergence(25.01)).toBe("low");
    expect(agreementFromDivergence(80)).toBe("low");
  });
});

describe("compareMetric (consolidação por métrica)", () => {
  it("média consolidada e diferença absoluta com as duas fontes", () => {
    const result = compareMetric(18.2, 19.6);
    expect(result.sourceA).toBe(18.2);
    expect(result.sourceB).toBe(19.6);
    expect(result.consolidated).toBeCloseTo(18.9, 10);
    expect(result.absoluteDifference).toBeCloseTo(1.4, 10);
    expect(result.agreement).toBe("high"); // 1,4/18,9 = 7,4%
  });

  it("divergência de 10% exato classifica como alta", () => {
    // |21-19| = 2; média = 20; 2/20*100 = 10% exato
    expect(compareMetric(21, 19).agreement).toBe("high");
  });

  it("divergência de 25% exato classifica como média", () => {
    // |9-7| = 2; média = 8; 2/8*100 = 25% exato
    expect(compareMetric(9, 7).agreement).toBe("medium");
  });

  it("apenas uma fonte com valor: consolidado é esse valor, sem concordância", () => {
    const onlyA = compareMetric(19, null);
    expect(onlyA.consolidated).toBe(19);
    expect(onlyA.absoluteDifference).toBeNull();
    expect(onlyA.percentageDivergence).toBeNull();
    expect(onlyA.agreement).toBe("unavailable");

    const onlyB = compareMetric(null, 21.5);
    expect(onlyB.consolidated).toBe(21.5);
    expect(onlyB.agreement).toBe("unavailable");
  });

  it("valor ausente nas duas fontes: consolidado null (nunca zero)", () => {
    const result = compareMetric(null, null);
    expect(result.consolidated).toBeNull();
    expect(result.agreement).toBe("unavailable");
  });

  it("ambos zero: divergência 0% e alta concordância", () => {
    const result = compareMetric(0, 0);
    expect(result.consolidated).toBe(0);
    expect(result.absoluteDifference).toBe(0);
    expect(result.percentageDivergence).toBe(0);
    expect(result.agreement).toBe("high");
  });

  it("um zero: divergência 200% e baixa concordância", () => {
    const result = compareMetric(0, 12);
    expect(result.consolidated).toBe(6);
    expect(result.percentageDivergence).toBe(200);
    expect(result.agreement).toBe("low");
  });
});

describe("compareMetric com tolerância absoluta perto de zero", () => {
  it("chuva: até 1 mm de diferença é alta concordância (caso 28/09: 1,0 × 0,0 mm)", () => {
    const result = compareMetric(1, 0, "precipitationMm");
    expect(result.percentageDivergence).toBe(200); // o percentual continua informado
    expect(result.agreement).toBe("high");
  });

  it("chuva: acima de 1 mm volta à regra percentual", () => {
    expect(compareMetric(2.5, 0, "precipitationMm").agreement).toBe("low");
    expect(compareMetric(12.4, 5, "precipitationMm").agreement).toBe("low");
  });

  it("chance de chuva: até 10 pontos é alta (caso 28/09: 4% × 6%)", () => {
    expect(compareMetric(4, 6, "precipitationProbabilityPercent").agreement).toBe("high");
    expect(compareMetric(90, 61, "precipitationProbabilityPercent").agreement).toBe("low");
  });

  it("métricas sem tolerância seguem só o percentual", () => {
    expect(compareMetric(11, 23.8, "windSpeedMaxKmh").agreement).toBe("low");
    expect(compareMetric(1, 0).agreement).toBe("low"); // sem key: regra original
  });
});

describe("overallAgreement (concordância geral do dia)", () => {
  it("todas altas: alta", () => {
    expect(overallAgreement(["high", "high", "high"])).toBe("high");
  });

  it("média de 2,5 (alta + média): alta (limite incluso)", () => {
    expect(overallAgreement(["high", "medium"])).toBe("high");
  });

  it("média entre 1,75 e 2,5: média", () => {
    expect(overallAgreement(["medium", "medium"])).toBe("medium"); // 2,0
    expect(overallAgreement(["high", "low"])).toBe("medium"); // 2,0
    expect(overallAgreement(["high", "medium", "low"])).toBe("medium"); // 2,0
    // Limite de 1,75 incluso: (2+2+2+1)/4 = 1,75
    expect(overallAgreement(["medium", "medium", "medium", "low"])).toBe("medium");
  });

  it("média abaixo de 1,75: baixa", () => {
    expect(overallAgreement(["medium", "medium", "low"])).toBe("low"); // 1,67
    expect(overallAgreement(["low", "low"])).toBe("low");
  });

  it("ignora métricas indisponíveis ao calcular a média", () => {
    expect(overallAgreement(["unavailable", "high"])).toBe("high");
    expect(overallAgreement(["unavailable", "unavailable", "low"])).toBe("low");
  });

  it("nenhuma métrica válida: indisponível", () => {
    expect(overallAgreement(["unavailable", "unavailable"])).toBe("unavailable");
    expect(overallAgreement([])).toBe("unavailable");
  });
});

describe("compareDay (comparação de um dia)", () => {
  const om = makeForecast("open-meteo", "2026-09-28", {
    temperatureMinC: 17.4,
    temperatureMaxC: 31.8,
    humidityPercent: 78,
    precipitationMm: 2.5,
    precipitationProbabilityPercent: 22,
    windSpeedMaxKmh: 21,
  });
  const wa = makeForecast("weather-api", "2026-09-28", {
    temperatureMinC: 15.8,
    temperatureMaxC: 30.7,
    humidityPercent: 66,
    precipitationMm: 0,
    // weather-api sem probabilidade de chuva (ausência, não zero)
    windSpeedMaxKmh: 23.8,
  });

  it("compara as seis métricas e calcula a concordância geral", () => {
    const day = compareDay("2026-09-28", om, wa);
    expect(day.date).toBe("2026-09-28");

    const tempMin = day.metrics.temperatureMinC;
    expect(tempMin.consolidated).toBeCloseTo(16.6, 10);
    expect(tempMin.agreement).toBe("high"); // |17,4-15,8|/16,6 = 9,6%

    const precip = day.metrics.precipitationMm;
    expect(precip.agreement).toBe("low"); // 2,5 vs 0 → 200%

    // Pontos: tempMin 3, tempMax 3, umidade 2, chuva 1, vento 2 → média 2,2 → média
    expect(day.overallAgreement).toBe("medium");
  });

  it("métrica ausente em uma fonte: indisponível só para ela", () => {
    const day = compareDay("2026-09-28", om, wa);
    const prob = day.metrics.precipitationProbabilityPercent;
    expect(prob.sourceA).toBe(22);
    expect(prob.sourceB).toBeNull();
    expect(prob.consolidated).toBe(22);
    expect(prob.agreement).toBe("unavailable");
  });

  it("fonte inteira ausente: consolidado das outras fontes e geral indisponível", () => {
    const day = compareDay("2026-09-28", om, undefined);
    for (const key of Object.keys(day.metrics) as (keyof typeof day.metrics)[]) {
      expect(day.metrics[key].agreement).toBe("unavailable");
    }
    expect(day.metrics.temperatureMaxC.consolidated).toBe(31.8);
    expect(day.overallAgreement).toBe("unavailable");
  });

  it("nenhuma fonte no dia: tudo indisponível e null (nunca zero)", () => {
    const day = compareDay("2026-09-28", undefined, undefined);
    expect(day.metrics.temperatureMinC.consolidated).toBeNull();
    expect(day.overallAgreement).toBe("unavailable");
  });
});

describe("alignForecastDays (alinhamento das fontes pela data)", () => {
  it("alinha datas comuns nas duas fontes", () => {
    const aligned = alignForecastDays({
      "open-meteo": [makeForecast("open-meteo", "2026-09-28")],
      "weather-api": [makeForecast("weather-api", "2026-09-28")],
    });
    expect(aligned).toHaveLength(1);
    expect(aligned[0].date).toBe("2026-09-28");
    expect(aligned[0].bySource["open-meteo"]).toBeDefined();
    expect(aligned[0].bySource["weather-api"]).toBeDefined();
  });

  it("datas presentes em apenas uma fonte permanecem com a outra ausente", () => {
    const aligned = alignForecastDays({
      "open-meteo": [
        makeForecast("open-meteo", "2026-09-28"),
        makeForecast("open-meteo", "2026-09-29"),
        makeForecast("open-meteo", "2026-09-30"),
      ],
      "weather-api": [
        makeForecast("weather-api", "2026-09-30"),
        makeForecast("weather-api", "2026-10-01"),
      ],
    });

    expect(aligned.map((day) => day.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ]);
    expect(aligned[0].bySource["weather-api"]).toBeUndefined();
    expect(aligned[2].bySource["open-meteo"]).toBeDefined();
    expect(aligned[2].bySource["weather-api"]).toBeDefined();
    expect(aligned[3].bySource["open-meteo"]).toBeUndefined();
  });

  it("normaliza datas com horário para a chave YYYY-MM-DD", () => {
    const aligned = alignForecastDays({
      "open-meteo": [makeForecast("open-meteo", "2026-09-28")],
      "weather-api": [makeForecast("weather-api", "2026-09-28T06:00:00Z")],
    });
    expect(aligned).toHaveLength(1);
    expect(aligned[0].date).toBe("2026-09-28");
  });

  it("entidades vazias ou sem fontes: vazio", () => {
    expect(alignForecastDays({})).toEqual([]);
  });
});

describe("compareAlignedDays (fluxo completo da rota)", () => {
  it("gera um DailyComparison por data alinhada, em ordem", () => {
    const comparisons = compareAlignedDays(
      alignForecastDays({
        "open-meteo": [
          makeForecast("open-meteo", "2026-09-30", { temperatureMaxC: 30 }),
          makeForecast("open-meteo", "2026-09-28", { temperatureMaxC: 31 }),
        ],
        "weather-api": [
          makeForecast("weather-api", "2026-09-28", { temperatureMaxC: 31 }),
          makeForecast("weather-api", "2026-09-29", { temperatureMaxC: 29 }),
        ],
      }),
    );

    expect(comparisons.map((day) => day.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    // Dia com as duas fontes iguais: alta concordância
    expect(comparisons[0].metrics.temperatureMaxC.agreement).toBe("high");
    // Dias com fonte única: indisponível
    expect(comparisons[1].overallAgreement).toBe("unavailable");
    expect(comparisons[2].overallAgreement).toBe("unavailable");
  });
});

describe("weatherApiErrorMessage (mensagens de erro em português)", () => {
  it("traduz os códigos citados no relatório (1006 e 2007)", () => {
    expect(weatherApiErrorMessage(1006)).toMatch(/não encontrou previsão/);
    expect(weatherApiErrorMessage(2007)).toMatch(/Limite mensal/);
  });

  it("código desconhecido ou ausente gera mensagem genérica", () => {
    expect(weatherApiErrorMessage(1234)).toBe("A WeatherAPI retornou um erro (código 1234).");
    expect(weatherApiErrorMessage(undefined, 503)).toBe("A WeatherAPI respondeu com o status HTTP 503.");
  });
});

describe("supabaseHeaders", () => {
  it("envia a chave nova (sb_secret_) apenas no cabeçalho apikey", async () => {
    const { supabaseHeaders } = await import("@/lib/supabase/history");
    const h = supabaseHeaders("sb_secret_abcdefghijklmnopqrstuvwxyz");
    expect(h.apikey).toBe("sb_secret_abcdefghijklmnopqrstuvwxyz");
    expect(h.Authorization).toBeUndefined();
  });

  it("mantém o Bearer para a chave clássica service_role (JWT)", async () => {
    const { supabaseHeaders } = await import("@/lib/supabase/history");
    const h = supabaseHeaders("eyJhbGciOiJIUzI1NiJ9.payload.assinatura");
    expect(h.Authorization).toBe("Bearer eyJhbGciOiJIUzI1NiJ9.payload.assinatura");
  });
});
