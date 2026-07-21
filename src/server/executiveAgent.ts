import { gerarTexto } from "../lib/ai";
import { db } from "../lib/db";
import type { IndicadoresComerciais } from "./kpiService";

/**
 * AGENTE EXECUTIVO
 * ================
 * Recebe os KPIs crus e responde como um diretor comercial responderia:
 * em português claro, apontando o que importa, o que está em risco e o que
 * fazer HOJE. Não descreve gráficos — interpreta e recomenda.
 */

export type InsightExecutivo = {
  tipo: "alerta" | "oportunidade" | "tendencia" | "acao";
  texto: string;
};

export async function gerarInsightsExecutivos(
  indicadores: IndicadoresComerciais,
  usuarioId?: string
): Promise<InsightExecutivo[]> {
  const prompt = `Você é o Diretor Comercial virtual da DeCasa Esquadrias (esquadrias de alumínio: portas, janelas, guarda-corpos, fachadas). Meta de vendas mensal: R$ ${indicadores.metaMensal.toLocaleString("pt-BR")}.

Analise os indicadores abaixo e gere de 4 a 7 insights em JSON puro (array, sem markdown), cada um no formato:
{"tipo": "alerta" | "oportunidade" | "tendencia" | "acao", "texto": "..."}

Regras dos insights:
- Escreva como um diretor comercial experiente falaria com o vendedor: direto, específico, com números.
- Priorize: (1) dinheiro parado e risco de perda, (2) clientes quentes esquecidos, (3) padrões de conversão que orientam onde investir energia, (4) ritmo vs meta mensal.
- Insights do tipo "acao" devem dizer exatamente o que fazer hoje, citando negociações pelo nome quando disponível.
- Se um dado for zero ou não houver amostra suficiente, NÃO invente padrão — só comente o que os números realmente sustentam.
- Nunca repita o mesmo número em dois insights.
- Máximo 2 frases por insight.

Indicadores:
${JSON.stringify(indicadores, null, 2)}`;

  try {
    const texto = await gerarTexto(prompt, 1200);
    const clean = texto.replace(/```json|```/g, "").trim();
    const insights = JSON.parse(clean) as InsightExecutivo[];

    await db.execucaoAgente.create({
      data: {
        agente: "executivo",
        usuarioId,
        entradaResumo: `KPIs: ${indicadores.negociacoesAbertas} abertas, R$ ${indicadores.valorTotalEmAberto} em aberto`,
        saidaResumo: `${insights.length} insights gerados`,
        sucesso: true,
      },
    });

    return insights;
  } catch (erro) {
    await db.execucaoAgente.create({
      data: {
        agente: "executivo",
        usuarioId,
        entradaResumo: `KPIs: ${indicadores.negociacoesAbertas} abertas, R$ ${indicadores.valorTotalEmAberto} em aberto`,
        saidaResumo: `Falha: ${(erro as Error).message}`.slice(0, 200),
        sucesso: false,
      },
    });
    return fallbackInsights(indicadores);
  }
}

/**
 * Se a IA falhar, o painel NUNCA fica vazio: insights determinísticos
 * calculados diretamente dos números. Filosofia: dado importante sempre chega.
 */
function fallbackInsights(i: IndicadoresComerciais): InsightExecutivo[] {
  const insights: InsightExecutivo[] = [];
  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  if (i.valorParado3Dias > 0) {
    insights.push({
      tipo: "alerta",
      texto: `Há ${brl(i.valorParado3Dias)} em ${i.negociacoesParadas3Dias} negociações paradas há mais de 3 dias.`,
    });
  }
  if (i.followUpsHoje > 0) {
    insights.push({
      tipo: "acao",
      texto: `${i.followUpsHoje} clientes precisam de follow-up hoje${i.followUpsAtrasados > 0 ? ` — e ${i.followUpsAtrasados} já estão atrasados` : ""}.`,
    });
  }
  if (i.perdidasSemana > 0) {
    insights.push({
      tipo: "alerta",
      texto: `Você perdeu ${i.perdidasSemana} oportunidade${i.perdidasSemana > 1 ? "s" : ""} esta semana (${brl(i.valorPerdidoSemana)}).`,
    });
  }
  insights.push({
    tipo: "tendencia",
    texto: `Mês atual: ${brl(i.valorGanhoMes)} vendidos de uma meta de ${brl(i.metaMensal)} (${Math.round((i.valorGanhoMes / i.metaMensal) * 100)}%).`,
  });

  return insights;
}
