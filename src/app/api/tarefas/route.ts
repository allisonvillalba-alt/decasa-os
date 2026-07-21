import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { exigirPapel } from "../../../lib/permissoes";

// GET /api/tarefas — todas as tarefas não concluídas, mais recentes primeiro
export async function GET() {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const tarefas = await db.tarefa.findMany({
    where: { concluida: false },
    orderBy: [{ dataLimite: "asc" }, { criadoEm: "desc" }],
    include: {
      negociacao: { select: { id: true, titulo: true } },
      responsavel: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(tarefas);
}

const criarTarefaSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA"]).default("MEDIA"),
  dataLimite: z.string().datetime().optional(),
  negociacaoId: z.string().optional(),
});

// POST /api/tarefas — cria uma nova tarefa manualmente
export async function POST(req: NextRequest) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const body = await req.json().catch(() => null);
  const parsed = criarTarefaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const tarefa = await db.tarefa.create({
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      prioridade: parsed.data.prioridade,
      dataLimite: parsed.data.dataLimite ? new Date(parsed.data.dataLimite) : undefined,
      negociacaoId: parsed.data.negociacaoId,
      responsavelId: sessao.user.id,
    },
  });

  return NextResponse.json(tarefa, { status: 201 });
}
