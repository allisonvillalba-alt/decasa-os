import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigirPapel } from "../../../../lib/permissoes";
import { criarLeadManual } from "../../../../server/criarLeadManual";

const criarManualSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  produtoInteresse: z.string().optional(),
  valorEstimado: z.number().nonnegative().optional(),
  observacao: z.string().optional(),
});

// POST /api/negociacoes/manual — cadastro manual de lead + negociação,
// sem passar pela IA (o vendedor já preencheu os dados estruturados).
export async function POST(req: NextRequest) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const body = await req.json().catch(() => null);
  const parsed = criarManualSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const resultado = await criarLeadManual(parsed.data, sessao.user.id, "MANUAL");

  return NextResponse.json(resultado, { status: 201 });
}
