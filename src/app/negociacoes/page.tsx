"use client";

import { useEffect, useState } from "react";
import { NegociacaoCard, type NegociacaoCardData } from "../../components/NegociacaoCard";
import { Carregando } from "../../components/Carregando";

const COLUNAS: { chave: string; titulo: string }[] = [
  { chave: "NOVO_LEAD", titulo: "Novo lead" },
  { chave: "QUALIFICACAO", titulo: "Qualificação" },
  { chave: "ORCAMENTO_ENVIADO", titulo: "Orçamento enviado" },
  { chave: "NEGOCIACAO", titulo: "Negociação" },
  { chave: "FECHADO_GANHO", titulo: "Fechado — ganho" },
  { chave: "FECHADO_PERDIDO", titulo: "Fechado — perdido" },
];

type Negociacao = NegociacaoCardData & { estagio: string };

export default function PaginaNegociacoes() {
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/negociacoes")
      .then((r) => r.json())
      .then(setNegociacoes)
      .finally(() => setCarregando(false));
  }, []);

  async function moverParaEstagio(negociacaoId: string, novoEstagio: string) {
    setNegociacoes((atual) =>
      atual.map((n) => (n.id === negociacaoId ? { ...n, estagio: novoEstagio } : n))
    );

    await fetch("/api/negociacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negociacaoId, novoEstagio }),
    });
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--ink)" }}>
          Negociações
        </h1>
        {carregando ? (
          <div style={{ marginTop: 4 }}>
            <Carregando texto="Carregando negociações…" />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0" }}>
            {negociacoes.length} negociações em andamento
          </p>
        )}
      </header>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
        {COLUNAS.map((coluna) => {
          const itens = negociacoes.filter((n) => n.estagio === coluna.chave);
          const totalColuna = itens.reduce((s, n) => s + (n.valorEstimado ?? 0), 0);

          return (
            <div
              key={coluna.chave}
              className="coluna-kanban"
              data-sobre-alvo={colunaAlvo === coluna.chave}
              onDragOver={(e) => {
                e.preventDefault();
                if (colunaAlvo !== coluna.chave) setColunaAlvo(coluna.chave);
              }}
              onDragLeave={() => setColunaAlvo((atual) => (atual === coluna.chave ? null : atual))}
              onDrop={(e) => {
                const negociacaoId = e.dataTransfer.getData("text/plain");
                if (negociacaoId) moverParaEstagio(negociacaoId, coluna.chave);
                setColunaAlvo(null);
              }}
              style={{
                minWidth: 260,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--ink-muted)" }}>
                  {coluna.titulo}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {itens.length}
                </span>
              </div>
              {totalColuna > 0 && (
                <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: -6 }}>
                  {totalColuna.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </span>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {itens.map((negociacao) => (
                  <div
                    key={negociacao.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", negociacao.id)}
                  >
                    <NegociacaoCard negociacao={negociacao} />
                  </div>
                ))}

                {itens.length === 0 && !carregando && (
                  <div
                    style={{
                      border: "1px dashed var(--border-strong)",
                      borderRadius: "var(--radius-md)",
                      padding: 16,
                      fontSize: 12,
                      color: "var(--ink-faint)",
                      textAlign: "center",
                    }}
                  >
                    Nada por aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
