import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";

// GET /api/negociacoes — lista todas as negociações agrupáveis por estágio (Kanban)
export async function GET() {
  const negociacoes = await db.negociacao.findMany({
    orderBy: { atualizadoEm: "desc" },
    include: {
      contato: true,
      empresa: true,
      lead: true,
      responsavel: { select: { id: true, nome: true } },
      followUps: {
        where: { status: "PENDENTE" },
        orderBy: { dataAgendada: "asc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(negociacoes);
}

const atualizarEstagioSchema = z.object({
  negociacaoId: z.string(),
  novoEstagio: z.enum([
    "NOVO_LEAD",
    "QUALIFICACAO",
    "ORCAMENTO_ENVIADO",
    "NEGOCIACAO",
    "FECHADO_GANHO",
    "FECHADO_PERDIDO",
    "PAUSADO",
  ]),
  motivoPerdido: z.string().optional(),
});

// PATCH /api/negociacoes — move um card entre colunas do Kanban (drag & drop)
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = atualizarEstagioSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { negociacaoId, novoEstagio, motivoPerdido } = parsed.data;

  const negociacao = await db.negociacao.update({
    where: { id: negociacaoId },
    data: {
      estagio: novoEstagio,
      motivoPerdido: novoEstagio === "FECHADO_PERDIDO" ? motivoPerdido : undefined,
      eventosTimeline: {
        create: {
          tipo: "estagio_alterado",
          descricao: `Estágio alterado para ${novoEstagio}`,
        },
      },
    },
  });

  return NextResponse.json(negociacao);
}
