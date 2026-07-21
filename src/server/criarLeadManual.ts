import { db } from "../lib/db";
import type { OrigemLead } from "@prisma/client";

export type DadosLeadManual = {
  nome?: string;
  telefone?: string;
  email?: string;
  produtoInteresse?: string;
  valorEstimado?: number;
  observacao?: string;
};

// Cria um Lead + Negociação a partir de dados já estruturados (preenchidos à
// mão ou vindos de planilha) — pula a interpretação por IA, que só faz
// sentido para texto cru recebido pelo WhatsApp.
export async function criarLeadManual(
  dados: DadosLeadManual,
  responsavelId: string,
  origem: OrigemLead
) {
  const identificador = dados.nome || dados.telefone || dados.email;
  if (!identificador) {
    throw new Error("lead sem nome, telefone ou email — nada para identificar o cliente");
  }

  const lead = await db.lead.create({
    data: {
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email || undefined,
      origem,
      interesseBruto: dados.observacao,
      produtosInteresse: dados.produtoInteresse ? [dados.produtoInteresse] : [],
      valorEstimado: dados.valorEstimado,
      processado: true,
    },
  });

  const titulo = `${dados.produtoInteresse ?? "Esquadria"} - ${identificador}`;

  const negociacao = await db.negociacao.create({
    data: {
      titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      estagio: "NOVO_LEAD",
      valorEstimado: dados.valorEstimado,
      probabilidade: 20,
      leadId: lead.id,
      responsavelId,
      eventosTimeline: {
        create: {
          tipo: "negociacao_criada",
          descricao:
            origem === "PLANILHA_IMPORTACAO"
              ? "Negociação criada por importação de planilha"
              : "Negociação cadastrada manualmente",
        },
      },
    },
  });

  return { leadId: lead.id, negociacaoId: negociacao.id };
}
