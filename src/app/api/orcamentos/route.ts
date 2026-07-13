import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";

const itemSchema = z.object({
  produto: z.string(),
  descricao: z.string().optional(),
  quantidade: z.number().positive(),
  valorUnitario: z.number().nonnegative(),
});

const criarOrcamentoSchema = z.object({
  negociacaoId: z.string(),
  itens: z.array(itemSchema).min(1),
  desconto: z.number().nonnegative().optional(),
  prazoEntrega: z.string().optional(),
});

// POST /api/orcamentos — cria uma nova versão de orçamento para a negociação
// e já move automaticamente o card para o estágio ORCAMENTO_ENVIADO.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = criarOrcamentoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { negociacaoId, itens, desconto, prazoEntrega } = parsed.data;

  const valorTotal =
    itens.reduce((soma, item) => soma + item.quantidade * item.valorUnitario, 0) -
    (desconto ?? 0);

  const versaoAnterior = await db.orcamento.count({ where: { negociacaoId } });

  const orcamento = await db.orcamento.create({
    data: {
      negociacaoId,
      versao: versaoAnterior + 1,
      valorTotal,
      desconto,
      prazoEntrega,
      status: "ENVIADO",
      itens,
    },
  });

  await db.negociacao.update({
    where: { id: negociacaoId },
    data: {
      estagio: "ORCAMENTO_ENVIADO",
      valorEstimado: valorTotal,
      eventosTimeline: {
        create: {
          tipo: "orcamento_criado",
          descricao: `Orçamento v${orcamento.versao} enviado no valor de R$ ${valorTotal.toFixed(2)}`,
        },
      },
    },
  });

  return NextResponse.json(orcamento, { status: 201 });
}
