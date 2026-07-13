"use client";

import { GaugeProbability } from "./GaugeProbability";

export type NegociacaoCardData = {
  id: string;
  titulo: string;
  valorEstimado: number | null;
  probabilidade: number | null;
  responsavel: { nome: string };
  followUps: { dataAgendada: string }[];
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function NegociacaoCard({ negociacao }: { negociacao: NegociacaoCardData }) {
  const proximoFollowUp = negociacao.followUps[0];
  const atrasado =
    proximoFollowUp && new Date(proximoFollowUp.dataAgendada) < new Date();

  return (
    <div
      draggable
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 12,
        boxShadow: "var(--shadow-card)",
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>
          {negociacao.titulo}
        </span>
        <GaugeProbability value={negociacao.probabilidade ?? 0} />
      </div>

      <span className="font-mono" style={{ fontSize: 15, fontWeight: 500, color: "var(--blueprint)" }}>
        {negociacao.valorEstimado ? formatadorMoeda.format(negociacao.valorEstimado) : "—"}
      </span>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          {negociacao.responsavel.nome}
        </span>

        {proximoFollowUp && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background: atrasado ? "var(--danger-tint)" : "var(--signal-tint)",
              color: atrasado ? "var(--danger)" : "var(--signal)",
            }}
          >
            {atrasado ? "Follow-up atrasado" : "Follow-up agendado"}
          </span>
        )}
      </div>
    </div>
  );
}
