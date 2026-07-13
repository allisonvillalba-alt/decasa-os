import { db } from "../lib/db";

/**
 * Converte um Lead recém-capturado em uma Negociação, já no estágio
 * NOVO_LEAD. O vendedor abre o Kanban e o card já está lá — nunca precisa
 * criar isso manualmente.
 */
export async function converterLeadEmNegociacao(leadId: string) {
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });

  // Responsável padrão: por enquanto, distribui para o primeiro admin/vendedor
  // ativo. Em um sprint futuro isso vira uma regra de distribuição de leads
  // (round-robin, por região, por produto, etc).
  const responsavel = await db.usuario.findFirstOrThrow({
    where: { ativo: true },
  });

  const titulo = montarTituloNegociacao(lead);

  const negociacao = await db.negociacao.create({
    data: {
      titulo,
      estagio: "NOVO_LEAD",
      valorEstimado: lead.valorEstimado ?? undefined,
      probabilidade: probabilidadeInicial(lead),
      leadId: lead.id,
      responsavelId: responsavel.id,
      eventosTimeline: {
        create: {
          tipo: "negociacao_criada",
          descricao: `Negociação criada automaticamente a partir de lead via ${lead.origem}`,
        },
      },
    },
  });

  return negociacao;
}

function montarTituloNegociacao(lead: {
  nome: string | null;
  produtosInteresse: string[];
  cidade: string | null;
}) {
  const produto = lead.produtosInteresse?.[0] ?? "Esquadria";
  const nomeCliente = lead.nome ?? "Cliente sem nome";
  const local = lead.cidade ? ` - ${lead.cidade}` : "";
  return `${capitalize(produto)} - ${nomeCliente}${local}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Probabilidade inicial simples baseada na urgência inferida pela IA.
 * Isso é só o ponto de partida — no Sprint 3 (Painel Executivo / Inteligência
 * de Vendas) esse cálculo passa a considerar histórico real de conversão.
 */
function probabilidadeInicial(lead: { urgenciaInferida: string | null }) {
  switch (lead.urgenciaInferida) {
    case "alta":
      return 40;
    case "media":
      return 20;
    case "baixa":
      return 10;
    default:
      return 15;
  }
}
