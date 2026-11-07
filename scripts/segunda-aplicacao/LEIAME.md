# Segunda aplicação do protótipo

Objetivo: medir, com dados reais de vários dias e cidades, (1) com que frequência a Open-Meteo e a
WeatherAPI.com concordam e (2) se, quando discordam, a previsão erra mais em relação ao que foi
observado.

## 1. Coleta (uma vez por dia, de preferência sempre no mesmo horário)

Na raiz do projeto, com `WEATHER_API_KEY` no `.env.local`:

```bash
npx tsx scripts/segunda-aplicacao/coletar.ts
```

- Consulta as 8 cidades dos polos do grupo (Campinas, Limeira, Mogi Mirim, Monte Mor, Pedreira,
  Santa Bárbara d'Oeste, Serra Negra e Socorro) nas duas fontes.
- Na primeira execução, salva as coordenadas em `cidades.json`; as coletas seguintes usam os mesmos pontos.
- Cada coleta fica em `dados/AAAA-MM-DD/<cidade>.json`, com a hora da consulta.
- Consome 8 chamadas por fonte por coleta (bem abaixo dos limites gratuitos).
- Se alguma fonte falhar, rode de novo mais tarde no mesmo dia (os arquivos do dia são substituídos).

## 2. Análise (pode ser rodada quantas vezes quiser)

```bash
npx tsx scripts/segunda-aplicacao/analisar.ts
```

Gera em `resultados/`:

- `comparacoes.csv`: cada variável de cada dia previsto, com os valores das fontes, o consolidado,
  a divergência e a concordância (com tolerância e pela regra original);
- `dias.csv`: concordância geral de cada dia previsto;
- `erros.csv`: erro de cada fonte e do consolidado em relação ao valor observado;
- `resumo.json`: tabelas-resumo.

O valor observado vem da reanálise ERA5 (Open-Meteo Historical Weather API, sem chave), que fica
disponível com cerca de 5 dias de atraso. Datas mais recentes aparecem sem observado até lá.

## 3. Questionário com potenciais usuários (opcional)

Ver `questionario.md`.
