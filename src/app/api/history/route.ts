import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRecentSnapshots, isHistoryEnabled } from "@/lib/supabase/history";

export const dynamic = "force-dynamic";

/** PROJECT.md §11: limite máximo de registros retornados. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const historyQuerySchema = z.object({
  lat: z.coerce.number().min(-90, "Latitude inválida").max(90, "Latitude inválida"),
  lon: z.coerce.number().min(-180, "Longitude inválida").max(180, "Longitude inválida"),
  limit: z.coerce
    .number()
    .int("Limite deve ser inteiro")
    .min(1)
    .max(MAX_LIMIT, `Limite máximo é ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validation = historyQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Desenvolvimento sem Supabase: histórico desativado, aplicação segue de pé.
  if (!isHistoryEnabled()) {
    return NextResponse.json({ enabled: false, snapshots: [] });
  }

  try {
    const { lat, lon, limit } = validation.data;
    const snapshots = await getRecentSnapshots(lat, lon, limit);
    return NextResponse.json({ enabled: true, snapshots });
  } catch (error) {
    console.error("Erro ao consultar o histórico:", error);
    return NextResponse.json(
      {
        enabled: true,
        snapshots: [],
        detail:
          error instanceof Error && error.message
            ? error.message
            : "Erro desconhecido ao consultar o histórico.",
      },
      { status: 502 }
    );
  }
}
