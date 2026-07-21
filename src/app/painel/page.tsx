"use client";

import { useEffect, useState } from "react";
import type { IndicadoresComerciais } from "../../server/kpiService";
import type { InsightExecutivo } from "../../server/executiveAgent";
import { Carregando } from "../../components/Carregando";

/**
 * PAINEL EXECUTIVO
 * Inversão deliberada do dashboard tradicional: o que abre a página não são
 * gráficos, são FRASES — o diretor comercial virtual falando. Os números
 * ficam abaixo, como evidência do que foi dito.
 */

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ESTILO_TIPO: Record<
  InsightExecutivo["tipo"],
  { rotulo: string; cor: string; fundo: string }
> = {
  alerta: { rotulo: "Alerta", cor: "var(--danger)", fundo: "var(--danger-tint)" },
  acao: { rotulo: "Fazer hoje", cor: "var(--signal)", fundo: "var(--signal-tint)" },
  oportunidade: { rotulo: "Oportunidade", cor: "var(--success)", fundo: "var(--success-tint)" },
  tendencia: { rotulo: "Tendência", cor: "var(--blueprint)", fundo: "var(--blueprint-tint)" },
};

export default function PaginaPainel() {
  const [dados, setDados] = useState<{
    indicadores: IndicadoresComerciais;
    insights: InsightExecutivo[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/painel")
      .then((r) => r.json())
      .then(setDados);
  }, []);

  if (!dados) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <Carregando texto="Analisando sua operação…" />
      </div>
    );
  }

  const { indicadores: kpi, insights } = dados;
  const progressoMeta = Math.min(Math.round((kpi.valorGanhoMes / kpi.metaMensal) * 100), 100);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Painel executivo
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          O que seu diretor comercial tem a dizer hoje.
        </p>
      </header>

      {/* 1. INSIGHTS — a voz do diretor comercial, em primeiro lugar */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {insights.map((insight, i) => {
          const estilo = ESTILO_TIPO[insight.tipo] ?? ESTILO_TIPO.tendencia;
          return (
            <div
              key={i}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: estilo.fundo,
                  color: estilo.cor,
                  whiteSpace: "nowrap",
                  marginTop: 1,
                }}
              >
                {estilo.rotulo}
              </span>
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>{insight.texto}</p>
            </div>
          );
        })}
      </section>

      {/* 2. META DO MÊS */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 20,
          marginBottom: 24,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)" }}>
            Meta do mês
          </span>
          <span className="font-mono" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {brl(kpi.valorGanhoMes)} / {brl(kpi.metaMensal)}
          </span>
        </div>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressoMeta}%`,
              height: "100%",
              background: progressoMeta >= 100 ? "var(--success)" : "var(--blueprint)",
              borderRadius: 999,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </section>

      {/* 3. NÚMEROS DE APOIO */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <CartaoNumero rotulo="Em negociação" valor={brl(kpi.valorTotalEmAberto)} detalhe={`${kpi.negociacoesAbertas} abertas`} />
        <CartaoNumero
          rotulo="Parado há 3+ dias"
          valor={brl(kpi.valorParado3Dias)}
          detalhe={`${kpi.negociacoesParadas3Dias} negociações`}
          critico={kpi.valorParado3Dias > 0}
        />
        <CartaoNumero rotulo="Follow-ups hoje" valor={String(kpi.followUpsHoje)} detalhe={kpi.followUpsAtrasados > 0 ? `${kpi.followUpsAtrasados} atrasados` : "nenhum atrasado"} critico={kpi.followUpsAtrasados > 0} />
        <CartaoNumero rotulo="Leads esta semana" valor={String(kpi.leadsNovosSemana)} detalhe={`semana anterior: ${kpi.leadsNovosSemanaAnterior}`} />
        <CartaoNumero rotulo="Ganhas na semana" valor={brl(kpi.valorGanhoSemana)} detalhe={`${kpi.ganhasSemana} fechadas`} />
        <CartaoNumero rotulo="Conversão do mês" valor={`${kpi.taxaConversaoMes}%`} detalhe={`mês anterior: ${kpi.taxaConversaoMesAnterior}%`} />
      </section>

      {/* 4. CLIENTES QUENTES */}
      {kpi.clientesQuentes.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 12px" }}>
            Clientes quentes agora
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {kpi.clientesQuentes.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 12 }}>
                <span style={{ fontWeight: 500 }}>{c.titulo}</span>
                <span className="font-mono" style={{ color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                  {c.probabilidade}% · {brl(c.valor)}
                  {c.diasParado >= 2 && (
                    <span style={{ color: "var(--danger)" }}> · parado {c.diasParado}d</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  critico,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  critico?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${critico ? "var(--danger)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        padding: 14,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", display: "block" }}>
        {rotulo}
      </span>
      <span className="font-mono" style={{ fontSize: 20, fontWeight: 500, display: "block", margin: "6px 0 2px", color: critico ? "var(--danger)" : "var(--ink)" }}>
        {valor}
      </span>
      {detalhe && (
        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{detalhe}</span>
      )}
    </div>
  );
}
