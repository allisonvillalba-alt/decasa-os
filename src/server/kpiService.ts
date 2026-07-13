import { db } from "../lib/db";

/**
 * AGREGADOR DE KPIs
 * Calcula todos os indicadores crus. O Agente Executivo (executiveAgent.ts)
 * recebe esta estrutura e a transforma em insights em linguagem natural.
 */

export type IndicadoresComerciais = {
  periodo: { inicio: string; fim: string };

  // Funil
  leadsNovosSemana: number;
  leadsNovosSemanaAnterior: number;
  negociacoesAbertas: number;
  valorTotalEmAberto: number;

  // Perdas e paradas (a dor central)
  perdidasSemana: number;
  valorPerdidoSemana: number;
  motivosPerda: { motivo: string; quantidade: number }[];
  negociacoesParadas3Dias: number;
  valorParado3Dias: number;
  followUpsHoje: number;
  followUpsAtrasados: number;

  // Conversão
  ganhasSemana: number;
  valorGanhoSemana: number;
  ganhasMes: number;
  valorGanhoMes: number;
  metaMensal: number;
  taxaConversaoMes: number; // %
  taxaConversaoMesAnterior: number; // %

  // Inteligência de origem e perfil
  conversaoPorOrigem: { origem: string; total: number; ganhas: number; taxa: number }[];
  ticketMedioPorTipoEmpresa: { tipo: string; ticketMedio: number; quantidade: number }[];

  // Clientes quentes
  clientesQuentes: { titulo: string; probabilidade: number; valor: number; diasParado: number }[];
};

const META_MENSAL = 150_000;

export async function calcularIndicadores(): Promise<IndicadoresComerciais> {
  const agora = new Date();
  const seteDiasAtras = diasAtras(7);
  const quatorzeDiasAtras = diasAtras(14);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const tresDiasAtras = diasAtras(3);

  const [
    leadsNovosSemana,
    leadsNovosSemanaAnterior,
    abertas,
    perdidasSemanaLista,
    ganhasSemanaLista,
    ganhasMesLista,
    fechadasMes,
    fechadasMesAnterior,
    followUpsHoje,
    followUpsAtrasados,
    leadsComNegociacao,
  ] = await Promise.all([
    db.lead.count({ where: { criadoEm: { gte: seteDiasAtras } } }),
    db.lead.count({
      where: { criadoEm: { gte: quatorzeDiasAtras, lt: seteDiasAtras } },
    }),
    db.negociacao.findMany({
      where: { estagio: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] } },
      include: { eventosTimeline: { orderBy: { criadoEm: "desc" }, take: 1 } },
    }),
    db.negociacao.findMany({
      where: { estagio: "FECHADO_PERDIDO", atualizadoEm: { gte: seteDiasAtras } },
    }),
    db.negociacao.findMany({
      where: { estagio: "FECHADO_GANHO", atualizadoEm: { gte: seteDiasAtras } },
    }),
    db.negociacao.findMany({
      where: { estagio: "FECHADO_GANHO", atualizadoEm: { gte: inicioMes } },
    }),
    db.negociacao.count({
      where: {
        estagio: { in: ["FECHADO_GANHO", "FECHADO_PERDIDO"] },
        atualizadoEm: { gte: inicioMes },
      },
    }),
    db.negociacao.findMany({
      where: {
        estagio: { in: ["FECHADO_GANHO", "FECHADO_PERDIDO"] },
        atualizadoEm: { gte: inicioMesAnterior, lt: inicioMes },
      },
      select: { estagio: true },
    }),
    db.followUp.count({ where: { status: "PENDENTE" } }),
    db.followUp.count({ where: { status: "ATRASADO" } }),
    db.lead.findMany({
      where: { negociacao: { isNot: null } },
      include: { negociacao: { select: { estagio: true } } },
    }),
  ]);

  // Negociações paradas há 3+ dias (baseado no último evento da timeline)
  const paradas = abertas.filter((n) => {
    const ultimo = n.eventosTimeline[0]?.criadoEm ?? n.criadoEm;
    return ultimo < tresDiasAtras;
  });

  // Motivos de perda agregados
  const motivosMap = new Map<string, number>();
  for (const p of perdidasSemanaLista) {
    const motivo = p.motivoPerdido ?? "não informado";
    motivosMap.set(motivo, (motivosMap.get(motivo) ?? 0) + 1);
  }

  // Conversão por origem (a partir dos leads que viraram negociação)
  const origemMap = new Map<string, { total: number; ganhas: number }>();
  for (const lead of leadsComNegociacao) {
    const atual = origemMap.get(lead.origem) ?? { total: 0, ganhas: 0 };
    atual.total += 1;
    if (lead.negociacao?.estagio === "FECHADO_GANHO") atual.ganhas += 1;
    origemMap.set(lead.origem, atual);
  }

  // Ticket médio por tipo de empresa (B2B)
  const ganhasComEmpresa = await db.negociacao.findMany({
    where: { estagio: "FECHADO_GANHO", empresaId: { not: null } },
    include: { empresa: { select: { tipo: true } } },
  });
  const tipoMap = new Map<string, { soma: number; qtd: number }>();
  for (const g of ganhasComEmpresa) {
    const tipo = g.empresa?.tipo ?? "OUTRO";
    const atual = tipoMap.get(tipo) ?? { soma: 0, qtd: 0 };
    atual.soma += Number(g.valorEstimado ?? 0);
    atual.qtd += 1;
    tipoMap.set(tipo, atual);
  }

  // Clientes quentes: probabilidade alta + parados
  const clientesQuentes = abertas
    .filter((n) => (n.probabilidade ?? 0) >= 50)
    .map((n) => {
      const ultimo = n.eventosTimeline[0]?.criadoEm ?? n.criadoEm;
      return {
        titulo: n.titulo,
        probabilidade: n.probabilidade ?? 0,
        valor: Number(n.valorEstimado ?? 0),
        diasParado: Math.floor((agora.getTime() - ultimo.getTime()) / 86_400_000),
      };
    })
    .sort((a, b) => b.probabilidade - a.probabilidade)
    .slice(0, 5);

  const ganhasMesAnterior = fechadasMesAnterior.filter(
    (f) => f.estagio === "FECHADO_GANHO"
  ).length;

  return {
    periodo: { inicio: seteDiasAtras.toISOString(), fim: agora.toISOString() },

    leadsNovosSemana,
    leadsNovosSemanaAnterior,
    negociacoesAbertas: abertas.length,
    valorTotalEmAberto: somaValor(abertas),

    perdidasSemana: perdidasSemanaLista.length,
    valorPerdidoSemana: somaValor(perdidasSemanaLista),
    motivosPerda: [...motivosMap.entries()].map(([motivo, quantidade]) => ({
      motivo,
      quantidade,
    })),
    negociacoesParadas3Dias: paradas.length,
    valorParado3Dias: somaValor(paradas),
    followUpsHoje,
    followUpsAtrasados,

    ganhasSemana: ganhasSemanaLista.length,
    valorGanhoSemana: somaValor(ganhasSemanaLista),
    ganhasMes: ganhasMesLista.length,
    valorGanhoMes: somaValor(ganhasMesLista),
    metaMensal: META_MENSAL,
    taxaConversaoMes: fechadasMes > 0 ? Math.round((ganhasMesLista.length / fechadasMes) * 100) : 0,
    taxaConversaoMesAnterior:
      fechadasMesAnterior.length > 0
        ? Math.round((ganhasMesAnterior / fechadasMesAnterior.length) * 100)
        : 0,

    conversaoPorOrigem: [...origemMap.entries()].map(([origem, dados]) => ({
      origem,
      total: dados.total,
      ganhas: dados.ganhas,
      taxa: dados.total > 0 ? Math.round((dados.ganhas / dados.total) * 100) : 0,
    })),
    ticketMedioPorTipoEmpresa: [...tipoMap.entries()].map(([tipo, dados]) => ({
      tipo,
      ticketMedio: dados.qtd > 0 ? Math.round(dados.soma / dados.qtd) : 0,
      quantidade: dados.qtd,
    })),

    clientesQuentes,
  };
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function somaValor(lista: { valorEstimado: unknown }[]) {
  return lista.reduce((s, n) => s + Number(n.valorEstimado ?? 0), 0);
}
