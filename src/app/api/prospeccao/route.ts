import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { pesquisarEmpresasProspeccao, salvarEmpresasProspectadas } from "../../../server/prospectionAgent";

const criterioSchema = z.object({
  segmento: z.string().min(3),
  regiao: z.string().min(2),
  quantidade: z.number().min(1).max(15).optional(),
});

// POST /api/prospeccao — dispara a pesquisa e salva os resultados
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = criterioSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  const encontradas = await pesquisarEmpresasProspeccao(parsed.data);

  if (encontradas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma empresa encontrada. Tente um segmento ou região mais específicos." },
      { status: 200 }
    );
  }

  const salvas = await salvarEmpresasProspectadas(encontradas);
  return NextResponse.json(salvas, { status: 201 });
}

// GET /api/prospeccao — lista empresas já prospectadas
export async function GET() {
  const empresas = await db.empresa.findMany({
    where: { origemProspec: true },
    include: { contatos: true },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(empresas);
}
