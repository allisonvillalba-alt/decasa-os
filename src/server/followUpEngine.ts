import { db } from "../lib/db";

/**
 * MOTOR DE PRIORIDADE DE FOLLOW-UP
 * ================================
 * O coração do sistema. Roda todo dia de madrugada (via job agendado) e
 * responde à pergunta: "quem o vendedor precisa contatar hoje, em que ordem,
 * e por quê?"
 *
 * A pontuação combina quatro fatores:
 *
 * 1. TEMPO PARADO — quanto mais dias sem interação, mais urgente.
 *    Curva agressiva: depois de 3 dias sem resposta a chance de perder o
 *    cliente cresce rápido (é exatamente a dor dos 30-40% de vendas perdidas).
 *
 * 2. VALOR — negociações de valor alto pesam mais. Deixar R$80.000 esfriar
 *    custa mais do que deixar R$3.000 esfriar.
 *
 * 3. PROBABILIDADE — clientes "quentes" (probabilidade alta) parados são a
 *    pior perda possível: estavam quase fechando.
 *
 * 4. ESTÁGIO — orçamento enviado sem resposta é mais crítico do que lead
 *    novo ainda não qualificado.
 *
 * O resultado inclui SEMPRE uma explicação em linguagem natural
 * (motivoPrioridade), porque a filosofia do sistema é: nunca mandar o
 * vendedor fazer algo sem dizer o porquê.
 */

const PESO_ESTAGIO: Record<string, number> = {
  ORCAMENTO_ENVIADO: 30, // dinheiro na mesa esperando resposta
  NEGOCIACAO: 25,
  QUALIFICACAO: 15,
  NOVO_LEAD: 20, // lead novo esfria rápido — responder no mesmo dia converte muito mais
  PAUSADO: 5,
};

export type ItemFilaDoDia = {
  negociacaoId: string;
  titulo: string;
  score: number;
  diasParado: number;
  valorEstimado: number;
  probabilidade: number;
  canalSugerido: "WHATSAPP" | "LIGACAO" | "EMAIL" | "VISITA";
  motivoPrioridade: string;
};

export async function calcularFilaDoDia(): Promise<ItemFilaDoDia[]> {
  const negociacoesAbertas = await db.negociacao.findMany({
    where: {
      estagio: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] },
    },
    include: {
      eventosTimeline: { orderBy: { criadoEm: "desc" }, take: 1 },
      conversas: {
        include: { mensagens: { orderBy: { enviadaEm: "desc" }, take: 1 } },
      },
    },
  });

  const agora = new Date();
  const fila: ItemFilaDoDia[] = [];

  for (const neg of negociacoesAbertas) {
    // Última interação = último evento da timeline OU última mensagem, o mais recente
    const ultimoEvento = neg.eventosTimeline[0]?.criadoEm ?? neg.criadoEm;
    const ultimaMensagem = neg.conversas
      .flatMap((c) => c.mensagens)
      .map((m) => m.enviadaEm)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const ultimaInteracao =
      ultimaMensagem && ultimaMensagem > ultimoEvento ? ultimaMensagem : ultimoEvento;

    const diasParado = Math.floor(
      (agora.getTime() - ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24)
    );

    const valor = Number(neg.valorEstimado ?? 0);
    const prob = neg.probabilidade ?? 15;

    // --- Cálculo do score ---
    // Tempo parado: curva quadrática limitada (3 dias = 9pts, 7 dias = 49pts, teto 60)
    const scoreTempo = Math.min(diasParado * diasParado, 60);

    // Valor: escala logarítmica — R$5k ≈ 12pts, R$50k ≈ 23pts, R$150k ≈ 28pts
    const scoreValor = valor > 0 ? Math.min(Math.log10(valor) * 5.5, 30) : 0;

    // Probabilidade: cliente quente parado = perda iminente
    const scoreProb = (prob / 100) * 25;

    const scoreEstagio = PESO_ESTAGIO[neg.estagio] ?? 10;

    const score = Math.round(scoreTempo + scoreValor + scoreProb + scoreEstagio);

    // Negociações com interação recente (hoje) não entram na fila
    if (diasParado < 1) continue;

    fila.push({
      negociacaoId: neg.id,
      titulo: neg.titulo,
      score,
      diasParado,
      valorEstimado: valor,
      probabilidade: prob,
      canalSugerido: sugerirCanal(neg.estagio, diasParado, valor),
      motivoPrioridade: explicarPrioridade(neg.estagio, diasParado, valor, prob),
    });
  }

  return fila.sort((a, b) => b.score - a.score);
}

function sugerirCanal(
  estagio: string,
  diasParado: number,
  valor: number
): ItemFilaDoDia["canalSugerido"] {
  // Alto valor + muito tempo parado: WhatsApp já não resolveu — ligar
  if (valor >= 30000 && diasParado >= 5) return "LIGACAO";
  // Orçamento enviado sem resposta há dias: ligação fecha mais que mensagem
  if (estagio === "ORCAMENTO_ENVIADO" && diasParado >= 4) return "LIGACAO";
  // Valor muito alto e negociação avançada: presença fecha negócio
  if (valor >= 80000 && estagio === "NEGOCIACAO") return "VISITA";
  return "WHATSAPP";
}

function explicarPrioridade(
  estagio: string,
  diasParado: number,
  valor: number,
  prob: number
): string {
  const partes: string[] = [];

  if (estagio === "ORCAMENTO_ENVIADO") {
    partes.push(`orçamento enviado há ${diasParado} dia${diasParado > 1 ? "s" : ""} sem resposta`);
  } else if (estagio === "NOVO_LEAD") {
    partes.push(`lead novo parado há ${diasParado} dia${diasParado > 1 ? "s" : ""} — leads esfriam rápido`);
  } else {
    partes.push(`sem interação há ${diasParado} dia${diasParado > 1 ? "s" : ""}`);
  }

  if (valor >= 30000) {
    partes.push(
      `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em jogo`
    );
  }

  if (prob >= 50) {
    partes.push(`cliente quente (${prob}% de chance de fechar)`);
  }

  const frase = partes.join(", ");
  return frase.charAt(0).toUpperCase() + frase.slice(1) + ".";
}
