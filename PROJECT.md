# AgroClima

## Plano técnico e guia de desenvolvimento

> Plataforma web responsiva e instalável como PWA para comparar previsões meteorológicas da Open-Meteo e WeatherAPI.com, apresentar divergências entre as fontes e calcular indicadores consolidados de fácil compreensão.

---

## 1. Objetivo do projeto

O AgroClima é um projeto acadêmico da disciplina Projeto Integrador em Computação VI da Univesp.

Seu objetivo é apoiar pequenos produtores e agricultores familiares por meio de uma aplicação simples que:

1. recebe uma cidade ou localização;
2. consulta duas APIs meteorológicas distintas;
3. normaliza os dados retornados;
4. compara as previsões das fontes;
5. calcula valores consolidados;
6. apresenta os resultados em uma interface responsiva;
7. registra consultas para permitir uma análise histórica simples.

O foco do projeto não é prever o clima por conta própria, mas tornar mais fácil comparar e interpretar previsões públicas.

---

## 2. Escopo do MVP

### Funcionalidades obrigatórias

- Buscar uma cidade por nome.
- Permitir o uso da localização atual do dispositivo, se autorizado pelo usuário.
- Obter latitude e longitude da localização selecionada.
- Consultar a Open-Meteo.
- Consultar a WeatherAPI.com.
- Normalizar as respostas das duas APIs para um formato interno único.
- Comparar os três dias disponíveis em ambas as fontes.
- Exibir, por dia:
  - temperatura mínima;
  - temperatura máxima;
  - umidade;
  - precipitação;
  - probabilidade de chuva;
  - velocidade do vento.
- Calcular:
  - média consolidada;
  - diferença absoluta;
  - divergência percentual;
  - nível de concordância entre as fontes.
- Exibir gráficos comparativos.
- Salvar um snapshot das consultas no Supabase.
- Exibir um histórico simples de consultas recentes.
- Possuir layout responsivo para desktop e celular.
- Ser instalável como PWA.
- Estar publicada em uma URL da Vercel.

### Funcionalidades opcionais

Implementar apenas se o MVP estiver concluído:

- favoritos de localização sem login, usando `localStorage`;
- funcionamento offline da última consulta;
- compartilhamento do resumo da previsão;
- filtros no histórico;
- exportação simples dos dados em CSV;
- comparação posterior entre previsão e clima observado.

### Fora do escopo

Não implementar nesta primeira versão:

- autenticação e cadastro de usuários;
- aplicativo nativo Android ou iOS;
- publicação em lojas;
- notificações push;
- Telegram;
- inteligência artificial ou machine learning;
- modelo meteorológico próprio;
- mapas complexos;
- painel administrativo;
- pagamentos;
- microserviços;
- backend em outro repositório;
- Docker como requisito;
- ORM;
- mais de duas APIs meteorológicas.

---

## 3. Stack definida

- **Runtime:** Node.js 24.19.
- **Linguagem:** TypeScript.
- **Framework full-stack:** Next.js com App Router.
- **Interface:** React.
- **Estilização:** Tailwind CSS.
- **Componentes:** shadcn/ui.
- **Ícones:** Lucide React.
- **Gráficos:** Recharts.
- **Validação:** Zod.
- **Banco e persistência:** Supabase Free.
- **API meteorológica 1:** Open-Meteo.
- **API meteorológica 2:** WeatherAPI.com.
- **Hospedagem:** Vercel Hobby.
- **PWA:** manifesto web, ícones e service worker, preferencialmente com Serwist.
- **Testes:** Vitest para regras de cálculo.
- **Gerenciador de pacotes:** npm.

Evitar adicionar bibliotecas sem necessidade. Antes de instalar uma dependência, verificar se a funcionalidade pode ser resolvida com recursos do Next.js, React ou navegador.

---

## 4. Arquitetura

A aplicação utiliza um único repositório e um único projeto Next.js.

```text
Navegador desktop ou celular
             |
             v
       Next.js responsivo
      /                   \
Interface React       Route Handlers
                           |
            +--------------+--------------+
            |                             |
       Open-Meteo                   WeatherAPI.com
            |                             |
            +--------------+--------------+
                           |
                      Normalização
                           |
                       Comparação
                           |
                      Consolidação
                           |
                        Supabase
```

### Regras arquiteturais

- O frontend nunca deve chamar a WeatherAPI.com diretamente.
- A chave da WeatherAPI.com deve existir apenas no servidor.
- Toda consulta meteorológica deve passar por um Route Handler do Next.js.
- As respostas externas devem ser normalizadas antes de chegar aos componentes.
- Componentes visuais não devem conhecer o formato original das APIs.
- Cálculos devem ficar em funções puras e testáveis.
- Eventuais falhas de persistência não devem impedir a exibição da previsão.
- Se uma API falhar, a aplicação deve informar que a comparação está indisponível, mas pode exibir a fonte que respondeu.

---

## 5. Fluxo principal

```text
1. Usuário informa uma cidade ou permite geolocalização.
2. Aplicação resolve latitude e longitude.
3. Frontend chama GET /api/forecast.
4. O servidor consulta as duas APIs em paralelo.
5. Cada provider converte a resposta para o modelo interno.
6. O sistema alinha os registros pela data local da previsão.
7. O sistema compara apenas datas existentes nas duas fontes.
8. O sistema calcula consolidados e divergências.
9. O servidor tenta salvar os snapshots no Supabase.
10. A resposta final é enviada ao frontend.
11. A interface exibe resumo, comparação e gráficos.
```

---

## 6. Estrutura de diretórios sugerida

```text
agroclima/
├── public/
│   ├── icons/
│   └── screenshots/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── forecast/
│   │   │   │   └── route.ts
│   │   │   ├── locations/
│   │   │   │   └── route.ts
│   │   │   └── history/
│   │   │       └── route.ts
│   │   ├── historico/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── manifest.ts
│   │   └── page.tsx
│   ├── components/
│   │   ├── weather/
│   │   │   ├── forecast-summary.tsx
│   │   │   ├── daily-forecast-card.tsx
│   │   │   ├── source-comparison.tsx
│   │   │   ├── agreement-badge.tsx
│   │   │   └── forecast-chart.tsx
│   │   ├── location/
│   │   │   ├── location-search.tsx
│   │   │   └── geolocation-button.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── weather/
│   │   │   ├── providers/
│   │   │   │   ├── open-meteo.ts
│   │   │   │   └── weather-api.ts
│   │   │   ├── normalize.ts
│   │   │   ├── compare.ts
│   │   │   ├── consolidate.ts
│   │   │   └── constants.ts
│   │   ├── supabase/
│   │   │   ├── server.ts
│   │   │   └── queries.ts
│   │   ├── env.ts
│   │   └── utils.ts
│   ├── schemas/
│   │   ├── forecast.ts
│   │   └── location.ts
│   └── types/
│       ├── forecast.ts
│       └── location.ts
├── supabase/
│   └── schema.sql
├── tests/
│   └── weather-calculations.test.ts
├── .env.example
├── .nvmrc
├── PROJECT.md
├── README.md
└── package.json
```

Não criar todas as pastas por antecipação se ainda não forem necessárias. A estrutura pode crescer conforme as etapas forem implementadas.

---

## 7. Modelo interno de dados

As duas APIs devem ser convertidas para o mesmo contrato.

```ts
export type WeatherSource = "open-meteo" | "weather-api";

export interface DailyForecast {
  source: WeatherSource;
  date: string;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  humidityPercent: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  windSpeedMaxKmh: number | null;
  conditionCode?: string | number | null;
  conditionLabel?: string | null;
}

export interface LocationData {
  name: string;
  state?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string | null;
}
```

O resultado comparativo diário deve seguir uma estrutura semelhante a:

```ts
export type AgreementLevel = "high" | "medium" | "low" | "unavailable";

export interface MetricComparison {
  sourceA: number | null;
  sourceB: number | null;
  consolidated: number | null;
  absoluteDifference: number | null;
  percentageDivergence: number | null;
  agreement: AgreementLevel;
}

export interface DailyComparison {
  date: string;
  temperatureMinC: MetricComparison;
  temperatureMaxC: MetricComparison;
  humidityPercent: MetricComparison;
  precipitationMm: MetricComparison;
  precipitationProbabilityPercent: MetricComparison;
  windSpeedMaxKmh: MetricComparison;
  overallAgreement: AgreementLevel;
}
```

---

## 8. Integração com as APIs

### 8.1 Open-Meteo

Usar coordenadas geográficas e solicitar dados diários equivalentes aos da segunda fonte.

Campos desejados:

- `temperature_2m_min`;
- `temperature_2m_max`;
- `precipitation_sum`;
- `precipitation_probability_max`;
- `wind_speed_10m_max`;
- umidade derivada dos dados horários ou equivalente disponível.

Configurações importantes:

- informar `timezone=auto`;
- trabalhar sempre em unidades métricas;
- limitar o resultado comparativo aos três primeiros dias;
- manter o código do provider isolado.

A Open-Meteo também poderá ser usada para busca de cidade por meio da API de geocodificação.

### 8.2 WeatherAPI.com

Consultar o endpoint de previsão usando latitude e longitude, evitando ambiguidades de nomes de cidade.

Requisitos:

- usar `days=3` no plano gratuito;
- trabalhar em unidades métricas;
- mapear somente campos necessários;
- manter a API key apenas no servidor;
- não persistir a chave no banco, frontend ou logs.

### 8.3 Compatibilidade entre as fontes

As APIs podem possuir métodos diferentes para produzir previsões. Portanto:

- comparar apenas variáveis semanticamente equivalentes;
- alinhar os resultados pela data local;
- não comparar condição textual por igualdade;
- não tratar ausência de dado como zero;
- registrar `null` quando uma métrica não estiver disponível;
- documentar diferenças de definição encontradas durante a implementação.

---

## 9. Regras de cálculo

### 9.1 Média consolidada

Para métricas presentes nas duas fontes:

```text
consolidado = (fonteA + fonteB) / 2
```

Se apenas uma fonte possuir valor, o consolidado pode exibir esse valor, mas deve ser marcado como proveniente de uma única fonte e sem nível de concordância.

### 9.2 Diferença absoluta

```text
diferença absoluta = |fonteA - fonteB|
```

### 9.3 Divergência percentual simétrica

```text
divergência percentual =
  diferença absoluta / ((|fonteA| + |fonteB|) / 2) * 100
```

Regras especiais:

- se ambos os valores forem zero, divergência igual a `0%`;
- se apenas um valor for zero, usar a fórmula normalmente;
- se algum valor for ausente, retornar `null`;
- limitar apenas a apresentação visual, não o valor armazenado;
- arredondar somente na camada de apresentação.

### 9.4 Nível de concordância

Classificação inicial do protótipo:

```text
0% até 10%: alta concordância
acima de 10% até 25%: média concordância
acima de 25%: baixa concordância
sem os dois valores: indisponível
```

Esses limites são uma regra interna do protótipo e não devem ser apresentados como padrão meteorológico oficial.

Tolerância absoluta perto de zero (ajuste após a primeira aplicação com dados reais, 28/09/2026): para precipitação e probabilidade de chuva, se a diferença absoluta entre as fontes for pequena, a concordância é alta independentemente do percentual.

```text
precipitação: diferença até 1 mm → alta concordância
probabilidade de chuva: diferença até 10 pontos percentuais → alta concordância
```

A divergência percentual continua sendo calculada e exibida. Os limiares são provisórios e serão revistos em novas aplicações (`ABSOLUTE_TOLERANCE` em `src/lib/weather/compare.ts`).

### 9.5 Concordância geral do dia

Converter os níveis disponíveis em pontos:

```text
alta = 3
média = 2
baixa = 1
```

Calcular a média apenas entre métricas que possuam comparação válida:

```text
média >= 2,5: alta
média >= 1,75 e < 2,5: média
média < 1,75: baixa
nenhuma métrica válida: indisponível
```

### 9.6 Terminologia

Usar:

- concordância;
- divergência;
- comparação;
- valor consolidado.

Evitar:

- precisão;
- acurácia;
- chance de acerto;
- fonte mais confiável.

A concordância entre duas previsões não prova que elas acertarão o clima observado.

---

## 10. Banco de dados no Supabase

Usar somente persistência necessária para histórico e demonstração.

### Tabela `locations`

```sql
create table if not exists public.locations (
  id bigint generated always as identity primary key,
  name text not null,
  state text,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  unique (latitude, longitude)
);
```

### Tabela `forecast_snapshots`

```sql
create table if not exists public.forecast_snapshots (
  id bigint generated always as identity primary key,
  location_id bigint not null references public.locations(id) on delete cascade,
  source text not null check (source in ('open-meteo', 'weather-api')),
  forecast_date date not null,
  collected_at timestamptz not null default now(),
  temperature_min_c double precision,
  temperature_max_c double precision,
  humidity_percent double precision,
  precipitation_mm double precision,
  precipitation_probability_percent double precision,
  wind_speed_max_kmh double precision,
  raw_data jsonb
);

create index if not exists forecast_snapshots_lookup_idx
  on public.forecast_snapshots (location_id, forecast_date, collected_at desc);
```

### Segurança

- O navegador não precisa escrever diretamente no banco.
- Escritas e leituras devem ocorrer nas rotas do servidor.
- A chave de serviço do Supabase, se utilizada, nunca pode possuir prefixo público.
- Não expor chave administrativa no frontend.
- Não armazenar dados pessoais.
- O salvamento de `raw_data` é opcional e pode ser removido se aumentar demais o banco.

---

## 11. Endpoints internos

### `GET /api/locations?query=campinas`

Responsabilidade:

- validar o texto de busca;
- consultar a geocodificação;
- retornar uma lista curta de localidades.

Resposta esperada:

```json
{
  "locations": [
    {
      "name": "Campinas",
      "state": "São Paulo",
      "country": "Brasil",
      "latitude": -22.9056,
      "longitude": -47.0608
    }
  ]
}
```

### `GET /api/forecast?lat=-22.9056&lon=-47.0608&name=Campinas`

Responsabilidade:

- validar coordenadas;
- consultar as duas APIs em paralelo;
- normalizar os dados;
- comparar os três dias comuns;
- tentar persistir os snapshots;
- retornar comparação e metadados.

Usar `Promise.allSettled` para permitir resposta parcial quando somente uma fonte estiver disponível.

### `GET /api/history?lat=-22.9056&lon=-47.0608&limit=20`

Responsabilidade:

- retornar snapshots recentes;
- aplicar limite máximo;
- não expor `raw_data` por padrão.

---

## 12. Cache e controle de chamadas

Para evitar chamadas desnecessárias:

- aplicar cache no servidor por localização;
- usar revalidação de aproximadamente 30 a 60 minutos;
- normalizar coordenadas antes de formar a chave de cache;
- não consultar as APIs novamente ao trocar apenas uma aba ou gráfico;
- impedir múltiplos envios simultâneos da mesma busca no frontend;
- não fazer polling automático no MVP.

Uma consulta manual do usuário deve resultar, idealmente, em no máximo uma chamada para cada provider durante o período de cache.

---

## 13. Interface e experiência mobile

### Página inicial

Elementos:

1. cabeçalho com nome e descrição curta;
2. busca de cidade;
3. botão para usar localização atual;
4. estado de carregamento;
5. resumo da previsão consolidada;
6. seletor dos três dias;
7. cards das métricas;
8. comparação entre as fontes;
9. gráfico comparativo;
10. explicação curta do indicador de concordância;
11. link para o histórico;
12. atribuição das fontes no rodapé.

### Prioridade mobile-first

- começar o layout pela largura de celular;
- evitar tabelas largas na tela principal;
- utilizar cards empilhados no mobile;
- usar gráficos com rolagem ou tamanho adaptável;
- garantir botões com área de toque adequada;
- não depender de hover;
- manter textos e números legíveis;
- testar em aproximadamente 360 px de largura.

### Estados obrigatórios

A interface deve possuir:

- estado inicial;
- carregamento;
- sucesso completo;
- sucesso parcial, quando apenas uma API responder;
- cidade não encontrada;
- localização negada;
- erro de rede;
- ausência de dados comparáveis.

---

## 14. PWA

A aplicação deve possuir:

- `manifest.ts` ou manifesto equivalente;
- nome `AgroClima`;
- `short_name` apropriado;
- ícones nos tamanhos necessários;
- `display: standalone`;
- `start_url: /`;
- cores de tema e fundo;
- service worker em produção;
- página responsiva e acessível por HTTPS na Vercel.

O objetivo mínimo da PWA é permitir instalação na tela inicial. Cache offline completo é opcional. Não armazenar respostas meteorológicas indefinidamente, pois previsões ficam desatualizadas.

---

## 15. Variáveis de ambiente

Criar `.env.example`:

```env
# WeatherAPI.com
WEATHER_API_KEY=

# Supabase usado somente no servidor
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Identificação pública da aplicação
NEXT_PUBLIC_APP_NAME=AgroClima
```

Regras:

- nunca versionar `.env.local`;
- nunca usar `NEXT_PUBLIC_` em segredos;
- validar variáveis no início da aplicação;
- permitir desenvolvimento sem Supabase, desativando somente o histórico;
- a falta da chave da WeatherAPI deve produzir mensagem clara no servidor.

---

## 16. Qualidade, testes e tratamento de erros

### Testes unitários mínimos

Criar testes para:

- média consolidada;
- diferença absoluta;
- divergência percentual;
- ambos os valores iguais a zero;
- um valor igual a zero;
- valor ausente;
- limites de concordância de 10% e 25%;
- concordância geral diária;
- alinhamento das fontes pela data.

### Regras de código

- habilitar TypeScript em modo estrito;
- evitar `any`;
- validar entradas externas com Zod;
- tratar todas as respostas HTTP não bem-sucedidas;
- definir timeout para provedores externos;
- não registrar segredos nos logs;
- não misturar cálculos com componentes React;
- manter funções pequenas e com nomes descritivos;
- escrever nomes técnicos no código em inglês;
- apresentar textos da interface em português do Brasil.

---

## 17. Etapas de implementação

### Fase 1: preparação

- criar projeto Next.js com TypeScript, Tailwind e App Router;
- declarar Node 24.19 no `.nvmrc` e no `package.json`;
- configurar lint e formatação;
- criar `.env.example`;
- instalar apenas dependências essenciais;
- criar layout básico mobile-first.

**Critério de conclusão:** aplicação abre localmente sem erros e possui página inicial responsiva.

### Fase 2: localização

- implementar busca de cidades;
- criar seleção de resultado;
- adicionar geolocalização do navegador;
- guardar a última localidade no `localStorage`.

**Critério de conclusão:** latitude e longitude corretas chegam ao frontend.

### Fase 3: providers meteorológicos

- implementar provider Open-Meteo;
- implementar provider WeatherAPI.com;
- criar modelo normalizado;
- tratar timeout, erro e ausência de campos;
- testar providers com a mesma coordenada.

**Critério de conclusão:** as duas fontes retornam três dias no mesmo contrato interno.

### Fase 4: cálculos

- implementar consolidação;
- implementar diferença absoluta;
- implementar divergência percentual;
- implementar classificação de concordância;
- implementar concordância geral;
- criar testes unitários.

**Critério de conclusão:** todos os testes de regras de negócio passam.

### Fase 5: interface comparativa

- criar resumo consolidado;
- criar seletor de dia;
- criar cards das métricas;
- criar comparação lado a lado;
- criar gráficos;
- criar estados de erro e resposta parcial.

**Critério de conclusão:** o usuário entende os valores de cada fonte e o consolidado sem consultar dados técnicos.

### Fase 6: Supabase e histórico

- criar tabelas pelo `schema.sql`;
- configurar cliente apenas no servidor;
- persistir localidades e snapshots;
- criar endpoint e página de histórico;
- garantir que erro no banco não derrube a previsão.

**Critério de conclusão:** uma consulta aparece no histórico.

### Fase 7: PWA e deploy

- adicionar manifesto e ícones;
- configurar service worker;
- testar instalação no Android e em navegador desktop;
- configurar variáveis na Vercel;
- publicar aplicação;
- executar teste ponta a ponta na URL pública.

**Critério de conclusão:** aplicação está acessível publicamente e pode ser adicionada à tela inicial.

### Fase 8: documentação e entrega

- atualizar README;
- adicionar capturas de tela;
- documentar APIs e cálculos;
- apresentar limitações;
- registrar decisões arquiteturais;
- preparar roteiro curto da demonstração.

**Critério de conclusão:** outra pessoa consegue instalar, executar e compreender o projeto pelo README.

---

## 18. Critérios de aceite do MVP

O MVP está concluído quando:

- [ ] uma cidade pode ser pesquisada;
- [ ] a geolocalização pode ser usada com permissão;
- [ ] Open-Meteo e WeatherAPI.com são consultadas;
- [ ] três dias são comparados;
- [ ] as seis métricas definidas são exibidas quando disponíveis;
- [ ] média, diferença e divergência são calculadas;
- [ ] o nível de concordância é apresentado com explicação;
- [ ] falha de uma fonte não quebra toda a aplicação;
- [ ] consultas são salvas no Supabase;
- [ ] histórico recente pode ser visualizado;
- [ ] interface funciona em celular e desktop;
- [ ] aplicação é instalável como PWA;
- [ ] segredos não aparecem no frontend ou repositório;
- [ ] regras de cálculo possuem testes;
- [ ] aplicação está publicada na Vercel;
- [ ] README explica execução, arquitetura, limitações e fontes.

---

## 19. Limitações que devem constar no relatório

- O valor consolidado é uma média simples e não constitui uma nova previsão meteorológica científica.
- As fontes podem usar modelos, horários de atualização e métodos diferentes.
- Concordância alta não significa que a previsão estará correta.
- Para avaliar acurácia, seria necessário comparar previsões armazenadas com observações posteriores.
- A WeatherAPI.com limita o horizonte gratuito usado pelo projeto a três dias.
- O protótipo depende da disponibilidade de serviços externos.
- Os níveis de concordância são parâmetros internos do projeto.
- O sistema não substitui orientação técnica agronômica nem alertas meteorológicos oficiais.

---

## 20. Orientações para desenvolvimento assistido por IA

Ao implementar tarefas com um agente de código:

1. Ler este arquivo antes de alterar a arquitetura.
2. Trabalhar em uma fase por vez.
3. Não adicionar funcionalidades fora do escopo sem solicitação explícita.
4. Não trocar a stack definida.
5. Não criar backend separado.
6. Não chamar APIs meteorológicas diretamente de componentes client-side.
7. Não expor segredos.
8. Criar primeiro a versão simples e funcional.
9. Executar lint, testes e build após alterações relevantes.
10. Explicar arquivos criados e decisões tomadas.
11. Preferir alterações pequenas e verificáveis.
12. Não simular respostas externas como se fossem dados reais.
13. Usar fixtures somente em testes ou modo de demonstração explicitamente identificado.
14. Preservar a terminologia de concordância e divergência.
15. Atualizar o README quando mudar comportamento visível ou configuração.

### Prompt inicial sugerido para o agente

```text
Leia o arquivo PROJECT.md inteiro e trate-o como a especificação principal do AgroClima.
Implemente apenas a Fase 1 do plano. Antes de codar, apresente um resumo curto dos arquivos que serão criados ou alterados. Depois, execute lint e build, corrija os erros encontrados e informe objetivamente o resultado. Não avance para as fases seguintes.
```

Após concluir cada fase, usar o mesmo formato:

```text
Leia o PROJECT.md e implemente somente a Fase N. Preserve a arquitetura e o escopo definidos. Execute os testes aplicáveis, lint e build antes de concluir. Não avance para outra fase.
```

---

## 21. Comandos iniciais sugeridos

```bash
npx create-next-app@latest agroclima --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd agroclima
npm install zod recharts lucide-react @supabase/supabase-js
npm install -D vitest
```

Adicionar o shadcn/ui somente quando os primeiros componentes forem necessários, evitando gerar componentes que não serão usados.

Criar `.nvmrc`:

```text
24.19.0
```

Adicionar ao `package.json`:

```json
{
  "engines": {
    "node": "24.19.x"
  }
}
```

Se alguma ferramenta do ecossistema ainda não aceitar essa versão durante a instalação, utilizar temporariamente uma versão LTS compatível e registrar a alteração no README.

---

## 22. Definição de pronto por tarefa

Uma tarefa é considerada pronta quando:

- atende ao critério funcional descrito;
- possui tratamento de erro básico;
- não expõe segredos;
- mantém boa experiência em tela pequena;
- não introduz erro de TypeScript;
- passa pelo lint;
- passa pelos testes aplicáveis;
- não quebra o build de produção;
- possui documentação quando necessário.

---

## 23. Resumo da decisão técnica

```text
Um repositório
Uma aplicação Next.js
Frontend e backend no mesmo projeto
Interface responsiva e PWA
Duas APIs meteorológicas
Comparações simples e explicáveis
Supabase somente para persistência
Deploy gratuito na Vercel
Sem autenticação e sem funcionalidades paralelas
```

A prioridade é entregar um protótipo acadêmico funcional, compreensível e demonstrável. Simplicidade tem preferência sobre escalabilidade prematura.
