import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { pesquisarEmpresasProspeccao, salvarEmpresasProspectadas } from "../../../server/prospectionAgent";
import { exigirPapel } from "../../../lib/permissoes";
import { limiteExcedido } from "../../../lib/rateLimit";

const criterioSchema = z.object({
  segmento: z.string().min(3),
  regiao: z.string().min(2),
  quantidade: z.number().min(1).max(15).optional(),
});

const MAX_PROSPECCOES_POR_HORA = 10;

// POST /api/prospeccao — dispara a pesquisa e salva os resultados
// Restrito a ADMIN/GESTOR: cada chamada consome cota de busca+IA — decisão
// de quando prospectar não deve ficar solta para qualquer vendedor.
export async function POST(req: NextRequest) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR"]);
  if (sessao instanceof Response) return sessao;

  const excedeu = await limiteExcedido(
    `prospeccao:${sessao.user.id}`,
    MAX_PROSPECCOES_POR_HORA,
    60 * 60
  );
  if (excedeu) {
    return NextResponse.json(
      { erro: "limite de prospecções por hora atingido, tente mais tarde" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = criterioSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  const encontradas = await pesquisarEmpresasProspeccao(parsed.data, sessao.user.id);

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
