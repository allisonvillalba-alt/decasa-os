import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { exigirPapel } from "../../../../lib/permissoes";

const atualizarTarefaSchema = z.object({
  concluida: z.boolean().optional(),
  titulo: z.string().min(1).optional(),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  dataLimite: z.string().datetime().nullable().optional(),
});

// PATCH /api/tarefas/:id — marca como concluída, edita título/prioridade/prazo
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const body = await req.json().catch(() => null);
  const parsed = atualizarTarefaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  const { dataLimite, ...resto } = parsed.data;

  const tarefa = await db.tarefa.update({
    where: { id: params.id },
    data: {
      ...resto,
      dataLimite: dataLimite === undefined ? undefined : dataLimite ? new Date(dataLimite) : null,
    },
  });

  return NextResponse.json(tarefa);
}
