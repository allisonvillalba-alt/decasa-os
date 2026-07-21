"use client";

import { useEffect, useState } from "react";
import type { IndicadoresComerciais } from "../../server/kpiService";
import { Carregando } from "../../components/Carregando";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function PaginaRelatorios() {
  const [kpi, setKpi] = useState<IndicadoresComerciais | null>(null);

  useEffect(() => {
    fetch("/api/painel")
      .then((r) => r.json())
      .then((dados) => setKpi(dados.indicadores));
  }, []);

  if (!kpi) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <Carregando texto="Montando relatórios…" />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Relatórios
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          De onde vêm as vendas, quem compra mais, e onde as negociações estão sendo perdidas.
        </p>
      </header>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
        <RelatorioCartao titulo="Conversão por origem">
          {kpi.conversaoPorOrigem.length === 0 ? (
            <SemDados texto="Ainda sem leads suficientes por origem." />
          ) : (
            <Tabela
              cabecalho={["Origem", "Leads", "Ganhas", "Taxa"]}
              linhas={kpi.conversaoPorOrigem.map((o) => [
                o.origem,
                String(o.total),
                String(o.ganhas),
                `${o.taxa}%`,
              ])}
            />
          )}
        </RelatorioCartao>

        <RelatorioCartao titulo="Ticket médio por tipo de cliente">
          {kpi.ticketMedioPorTipoEmpresa.length === 0 ? (
            <SemDados texto="Ainda sem negociações B2B fechadas com empresa vinculada." />
          ) : (
            <Tabela
              cabecalho={["Tipo", "Ticket médio", "Qtd."]}
              linhas={kpi.ticketMedioPorTipoEmpresa.map((t) => [
                t.tipo.replace(/_/g, " "),
                brl(t.ticketMedio),
                String(t.quantidade),
              ])}
            />
          )}
        </RelatorioCartao>

        <RelatorioCartao titulo="Motivos de perda (últimos 7 dias)">
          {kpi.motivosPerda.length === 0 ? (
            <SemDados texto="Nenhuma negociação perdida essa semana." />
          ) : (
            <Tabela
              cabecalho={["Motivo", "Quantidade"]}
              linhas={kpi.motivosPerda.map((m) => [m.motivo, String(m.quantidade)])}
            />
          )}
        </RelatorioCartao>

        <RelatorioCartao titulo="Desempenho por anúncio (Meta)">
          {kpi.desempenhoPorAnuncio.length === 0 ? (
            <SemDados texto="Nenhum lead com anúncio identificado ainda." />
          ) : (
            <Tabela
              cabecalho={["Anúncio", "Leads", "Ganhas", "Receita"]}
              linhas={kpi.desempenhoPorAnuncio.map((a) => [
                a.anuncio,
                String(a.leads),
                String(a.ganhas),
                brl(a.valorGanho),
              ])}
            />
          )}
        </RelatorioCartao>
      </div>
    </div>
  );
}

function RelatorioCartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 18,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 12px" }}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {cabecalho.map((c, i) => (
            <th
              key={c}
              style={{
                textAlign: i === 0 ? "left" : "right",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                letterSpacing: 0.3,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => (
          <tr key={i}>
            {linha.map((valor, j) => (
              <td
                key={j}
                className={j > 0 ? "font-mono" : undefined}
                style={{
                  textAlign: j === 0 ? "left" : "right",
                  padding: "8px 0",
                  borderBottom: i < linhas.length - 1 ? "1px solid var(--border)" : "none",
                  color: j === 0 ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {valor}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SemDados({ texto }: { texto: string }) {
  return <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>{texto}</p>;
}
