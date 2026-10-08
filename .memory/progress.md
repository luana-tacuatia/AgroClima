# AgroClima Memory

## Current State
- **Fases 1 a 5:** concluídas. **Fase 6:** código concluído; falta rodar o `schema.sql` no banco (ação do usuário).
- **Fase 6 (Supabase e histórico) — o que foi feito nesta sessão:**
  - `env.ts`: aceita `SUPABASE_SERVICE_ROLE_KEY` (antigo) OU `SUPABASE_SECRET_KEY` (painel novo do Supabase — o usuário tem esse nome).
  - `history.ts`: header sempre com `Authorization: Bearer` (compatível com chaves `sb_secret_...`).
  - Rota `/api/forecast`: salva snapshots via `saveForecastSnapshots` (não bloqueia; falha → `history.saved=false`).
    Schema de forecast ganhou `state`/`country` opcionais; os clientes (`page.tsx`, `comparar-client.tsx`) passam.
  - Nova rota `GET /api/history?lat&lon&limit` (default 20, máx 100; sem raw_data; 502 com detail em erro;
    `{enabled:false}` quando Supabase não configurado).
  - Nova página `/historico` (server component lê searchParams; client agrupa snapshots por `collected_at`,
    busca alternativa via SearchCard, estados: vazio/desativado/erro/Carregando + botão Atualizar).
  - Navbar: 3 links (Início / Comparar / Histórico).
- **Diagnóstico atual (testado ao vivo):** autenticação no Supabase OK; endpoint responde
  `PGRST205 "Could not find the table 'public.locations' in the schema cache"` → **o usuário ainda não
  executou `supabase/schema.sql` no SQL Editor do Supabase**. Após executar: invalidar schema cache
  (Database → Schema cache → Invalidate) e retestar.
- `npm run lint` ✅ · `npm run build` ✅ (rotas: /, /comparar, /historico, /api/forecast, /api/history, /api/locations) · `npm test` 30/30 ✅

## Important Files
- `PROJECT.md` — especificação. `README.md` — Status por fase (Fase 6 com pendência do banco anotada).
- `supabase/schema.sql` — tabelas locations + forecast_snapshots (RLS habilitado, sem políticas).
- `src/lib/supabase/history.ts` — PostgREST puro (fetch): saveForecastSnapshots, getRecentSnapshots, isHistoryEnabled.
- `src/app/api/forecast/route.ts` — cache 30 min + save de snapshots.
- `src/app/api/history/route.ts` — nova rota de histórico.
- `src/app/historico/page.tsx` + `src/components/historico/history-client.tsx` — página de histórico.
- `src/components/layout/app-navbar.tsx` — 3 links com aria-current.
- `src/lib/weather/compare.ts` + `tests/weather-calculations.test.ts` — cálculos + 30 testes.
- `src/components/comparacao/forecast-comparison-chart.tsx` — gráfico Recharts.

## Environment Notes
- macOS arm64, Node 20.11.0 (projeto declara 24.19.x; npm só avisa).
- `.env` usa os nomes NOVOS do Supabase: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
  SUPABASE_JWKS_URL (sem SUPABASE_SERVICE_ROLE_KEY — o env.ts agora aceita SECRET_KEY como fallback).
  Não ler .env (bloqueado); checar presença com grep de nomes.
- `create_new_file` falha intermitentemente → criar arquivos com `cat > arquivo << 'EOF'`.
- Edits às vezes "aplicam" mas não persistem → conferir sempre com grep/sed após editar.
- Dev server: `npm run dev` em background, log `/tmp/agroclima-dev.log`; parar com `pkill -f "next dev"`.
- Git: branch `feature/comparacao-concordancia` com tracking do origin. Usuário comita por conta própria.

## Decisions
- Fonte 2 = WeatherAPI.com. Supabase via PostgREST puro (sem @supabase/supabase-js) — decisão da dev, mantida.
- Save de snapshots: `await` na rota (garante conclusão no serverless); erro tratado internamente
  (retorna {saved:false, reason}) e nunca quebra a previsão.
- `locations.country` NOT NULL → default "BR" quando o cliente não informa (caso geolocalização).
- Histórico agrupa por `collected_at` idêntico (INSERT em lote usa now() da transação → mesma marca).
- Navbar: rótulos curtos (Início/Comparar/Histórico) para caber em 360px.

## Validation History
- Build passou com as rotas novas (/api/history, /historico).
- Ao vivo: /api/forecast (Campinas) → 2 fontes ok + `history.saved=false` (motivo: tabela inexistente).
- Ao vivo: /api/history → 502 com detail "Supabase respondeu com status 404" (PGRST205).
- Autenticação com SUPABASE_SECRET_KEY + Bearer funcionando (erro é de schema, não de auth).
- /historico: 200; navbar com 3 links confirmada no HTML.

## Next Steps
1. **Ação do usuário:** rodar `supabase/schema.sql` no SQL Editor do Supabase; se persistir PGRST205,
   invalidar o schema cache (Database → Schema cache → Invalidate).
2. Reteste: `GET /api/forecast?lat=-22.9056&lon=-47.0608&name=...` (nome novo p/ pular cache) →
   `history.saved=true`; depois `GET /api/history?lat=-22.9056&lon=-47.0608` → snapshots.
   = critério de conclusão da Fase 6 ("uma consulta aparece no histórico").
3. Commit da Fase 6 (usuário comita por conta).
4. Fase 7: PWA (`src/app/manifest.ts`, ícones em `public/icons/`, service worker) + deploy Vercel
   (configurar WEATHER_API_KEY + SUPABASE_URL + SUPABASE_SECRET_KEY nas envs da Vercel).
5. Fase 8: screenshots, documentação final, roteiro de demo.

## Resume Rule
- Para continuar em outra máquina: ler `PROJECT.md` e depois este arquivo.
