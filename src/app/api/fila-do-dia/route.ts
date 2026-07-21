import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { gerarMensagemFollowUp } from "../../../server/followUpMessageAgent";

// GET /api/fila-do-dia — a fila de follow-up de hoje, em ordem de prioridade
export async function GET() {
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const fila = await db.followUp.findMany({
    where: {
      status: { in: ["PENDENTE", "ATRASADO"] },
    },
    orderBy: { prioridade: "desc" },
    include: {
      negociacao: {
        include: {
          lead: { select: { nome: true, telefone: true, anuncioMetaTitulo: true } },
          contato: { select: { nome: true, telefone: true } },
        },
      },
    },
  });

  return NextResponse.json(fila);
}

const acaoSchema = z.object({
  followUpId: z.string(),
  acao: z.enum(["concluir", "gerar_mensagem"]),
});

// PATCH /api/fila-do-dia — concluir um follow-up ou gerar mensagem sob demanda
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = acaoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  const { followUpId, acao } = parsed.data;

  if (acao === "concluir") {
    const followUp = await db.followUp.update({
      where: { id: followUpId },
      data: { status: "CONCLUIDO", concluidoEm: new Date() },
    });

    await db.eventoTimeline.create({
      data: {
        negociacaoId: followUp.negociacaoId,
        tipo: "follow_up_concluido",
        descricao: `Follow-up realizado via ${followUp.canal}`,
      },
    });

    return NextResponse.json(followUp);
  }

  // gerar_mensagem: para itens fora do top da fila (mensagem sob demanda)
  const followUp = await db.followUp.findUniqueOrThrow({ where: { id: followUpId } });
  const { mensagem, dentroJanela24h } = await gerarMensagemFollowUp(followUp.negociacaoId);

  const atualizado = await db.followUp.update({
    where: { id: followUpId },
    data: { mensagemSugerida: mensagem },
  });

  return NextResponse.json({ ...atualizado, dentroJanela24h });
}
