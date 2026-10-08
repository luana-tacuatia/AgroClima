export interface ServerEnv {
  weatherApiKey: string | null;
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  /** true apenas quando as duas variáveis do Supabase estão presentes. */
  hasSupabase: boolean;
}

let cachedEnv: ServerEnv | null = null;

/**
 * Valida as variáveis usadas apenas no servidor.
 *
 * Regras:
 * - Segredos nunca devem ter prefixo NEXT_PUBLIC_.
 * - Variáveis opcionais inválidas desativam a funcionalidade correspondente
 *   (ex.: histórico sem Supabase) em vez de derrubar a aplicação.
 * - Nenhum valor de segredo é logado.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const weatherApiKey = parseOptionalStringVar("WEATHER_API_KEY", process.env.WEATHER_API_KEY, 10);
  const supabaseUrl = parseSupabaseUrl(process.env.SUPABASE_URL);
  // O painel novo do Supabase chama a chave secreta de "SUPABASE_SECRET_KEY";
  // o nome clássico é "SUPABASE_SERVICE_ROLE_KEY". Aceitamos os dois.
  const supabaseServiceRoleKey =
    parseOptionalStringVar("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY, 20) ??
    parseOptionalStringVar("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY, 20);

  cachedEnv = {
    weatherApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    hasSupabase: Boolean(supabaseUrl && supabaseServiceRoleKey),
  };

  return cachedEnv;
}

function parseOptionalStringVar(name: string, raw: string | undefined, minLength: number): string | null {
  if (!raw || raw.trim() === "") return null;
  const value = raw.trim();
  if (value.length < minLength) {
    console.warn(`[env] ${name} parece incompleta; a funcionalidade correspondente será desativada.`);
    return null;
  }
  return value;
}

function parseSupabaseUrl(raw: string | undefined): string | null {
  if (!raw || raw.trim() === "") return null;
  const value = raw.trim();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("protocolo não suportado");
    }
    return value;
  } catch {
    console.warn("[env] SUPABASE_URL inválida; a persistência de histórico será desativada.");
    return null;
  }
}
