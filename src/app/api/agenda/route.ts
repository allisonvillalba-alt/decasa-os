import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { exigirPapel } from "../../../lib/permissoes";

// GET /api/agenda — follow-ups agendados + tarefas com prazo, unificados
// numa lista só, pra alimentar a visão de calendário.
export async function GET() {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const [followUps, tarefas] = await Promise.all([
    db.followUp.findMany({
      where: { status: { in: ["PENDENTE", "ATRASADO"] } },
      include: { negociacao: { select: { id: true, titulo: true } } },
    }),
    db.tarefa.findMany({
      where: { concluida: false, dataLimite: { not: null } },
      include: { negociacao: { select: { id: true, titulo: true } } },
    }),
  ]);

  const itens = [
    ...followUps.map((f) => ({
      id: `followup-${f.id}`,
      tipo: "follow_up" as const,
      titulo: f.negociacao.titulo,
      data: f.dataAgendada.toISOString(),
      canal: f.canal,
      negociacaoId: f.negociacao.id,
    })),
    ...tarefas.map((t) => ({
      id: `tarefa-${t.id}`,
      tipo: "tarefa" as const,
      titulo: t.titulo,
      data: t.dataLimite!.toISOString(),
      prioridade: t.prioridade,
      negociacaoId: t.negociacao?.id ?? null,
    })),
  ];

  return NextResponse.json(itens);
}
