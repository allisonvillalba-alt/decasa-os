import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gerarCadenciaProspeccao } from "../../../../server/cadenceAgent";

const schema = z.object({ empresaId: z.string() });

// POST /api/prospeccao/cadencia — gera a cadência de 3 toques para uma empresa
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: "empresaId é obrigatório" }, { status: 400 });
  }

  const cadencia = await gerarCadenciaProspeccao(parsed.data.empresaId);
  return NextResponse.json(cadencia);
}
