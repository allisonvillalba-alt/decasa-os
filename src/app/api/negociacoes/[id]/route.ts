import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";

// GET /api/negociacoes/:id — detalhe completo de uma negociação
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const negociacao = await db.negociacao.findUnique({
    where: { id },
    include: {
      lead: true,
      contato: true,
      empresa: true,
      responsavel: { select: { id: true, nome: true } },
      orcamentos: { orderBy: { criadoEm: "desc" } },
      eventosTimeline: { orderBy: { criadoEm: "desc" }, take: 20 },
      followUps: { orderBy: { criadoEm: "desc" }, take: 10 },
      conversas: {
        include: { mensagens: { orderBy: { enviadaEm: "desc" }, take: 10 } },
      },
    },
  });

  if (!negociacao) {
    return NextResponse.json({ erro: "negociação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(negociacao);
}

const atualizarNegociacaoSchema = z.object({
  titulo: z.string().min(1).optional(),
  valorEstimado: z.number().nonnegative().nullable().optional(),
  probabilidade: z.number().min(0).max(100).optional(),
  estagio: z
    .enum([
      "NOVO_LEAD",
      "QUALIFICACAO",
      "ORCAMENTO_ENVIADO",
      "NEGOCIACAO",
      "FECHADO_GANHO",
      "FECHADO_PERDIDO",
      "PAUSADO",
    ])
    .optional(),
  motivoPerdido: z.string().optional(),
});

// PATCH /api/negociacoes/:id — edita os dados de uma negociação (tela de detalhe)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => null);
  const parsed = atualizarNegociacaoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existente = await db.negociacao.findUnique({ where: { id }, select: { estagio: true } });
  if (!existente) {
    return NextResponse.json({ erro: "negociação não encontrada" }, { status: 404 });
  }

  const { titulo, valorEstimado, probabilidade, estagio, motivoPerdido } = parsed.data;
  const mudouEstagio = estagio && estagio !== existente.estagio;

  const negociacao = await db.negociacao.update({
    where: { id },
    data: {
      titulo,
      valorEstimado,
      probabilidade,
      estagio,
      motivoPerdido: estagio === "FECHADO_PERDIDO" ? motivoPerdido : undefined,
      eventosTimeline: mudouEstagio
        ? { create: { tipo: "estagio_alterado", descricao: `Estágio alterado para ${estagio}` } }
        : undefined,
    },
  });

  return NextResponse.json(negociacao);
}
