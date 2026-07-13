"use client";

import { useState } from "react";
import type { EtapaCadencia } from "../../server/cadenceAgent";

type EmpresaProspectada = {
  id: string;
  nome: string;
  tipo: string;
  cidade: string | null;
  estado: string | null;
  site: string | null;
  observacoes: string | null;
  contatos: { nome: string; cargo: string | null }[];
};

const ROTULO_CANAL: Record<EtapaCadencia["canal"], string> = {
  EMAIL: "E-mail",
  LIGACAO: "Ligação",
  LINKEDIN: "LinkedIn",
};

export default function PaginaProspeccao() {
  const [segmento, setSegmento] = useState("construtoras de médio/alto padrão");
  const [regiao, setRegiao] = useState("São Paulo, SP");
  const [buscando, setBuscando] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaProspectada[]>([]);
  const [cadenciaAberta, setCadenciaAberta] = useState<string | null>(null);
  const [cadencia, setCadencia] = useState<EtapaCadencia[]>([]);
  const [gerandoCadencia, setGerandoCadencia] = useState(false);

  async function pesquisar() {
    setBuscando(true);
    const resp = await fetch("/api/prospeccao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmento, regiao, quantidade: 8 }),
    });
    const resultado = await resp.json();
    setEmpresas((atual) => [...(Array.isArray(resultado) ? resultado : []), ...atual]);
    setBuscando(false);
  }

  async function abrirCadencia(empresaId: string) {
    setCadenciaAberta(empresaId);
    setGerandoCadencia(true);
    const resp = await fetch("/api/prospeccao/cadencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId }),
    });
    setCadencia(await resp.json());
    setGerandoCadencia(false);
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Prospecção B2B
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          Pesquisa apenas informação pública, respeitando a LGPD. Revise sempre antes de contatar.
        </p>
      </header>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <input
          value={segmento}
          onChange={(e) => setSegmento(e.target.value)}
          placeholder="Segmento (ex: escritórios de arquitetura)"
          style={campoEstilo}
        />
        <input
          value={regiao}
          onChange={(e) => setRegiao(e.target.value)}
          placeholder="Região (ex: São Paulo, SP)"
          style={campoEstilo}
        />
        <button onClick={pesquisar} disabled={buscando} style={botaoPrimario}>
          {buscando ? "Pesquisando…" : "Pesquisar empresas"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {empresas.map((empresa) => (
          <div
            key={empresa.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{empresa.nome}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--blueprint-tint)",
                      color: "var(--blueprint)",
                    }}
                  >
                    {empresa.tipo.replace(/_/g, " ")}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "4px 0 0" }}>
                  {[empresa.cidade, empresa.estado].filter(Boolean).join(", ")}
                  {empresa.site ? ` · ${empresa.site}` : ""}
                </p>
              </div>
            </div>

            {empresa.observacoes && (
              <p style={{ fontSize: 13, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.45 }}>
                {empresa.observacoes}
              </p>
            )}

            {empresa.contatos[0] && (
              <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "6px 0 0" }}>
                Contato público: {empresa.contatos[0].nome} — {empresa.contatos[0].cargo}
              </p>
            )}

            <button
              onClick={() => abrirCadencia(empresa.id)}
              style={{ ...botaoSecundario, marginTop: 12 }}
            >
              Gerar cadência de prospecção
            </button>

            {cadenciaAberta === empresa.id && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {gerandoCadencia && (
                  <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Escrevendo cadência…</p>
                )}
                {cadencia.map((etapa, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--blueprint-tint)",
                      borderRadius: "var(--radius-sm)",
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--blueprint)", marginBottom: 4 }}>
                      <span>DIA {etapa.dia}</span>
                      <span>·</span>
                      <span>{ROTULO_CANAL[etapa.canal]}</span>
                    </div>
                    {etapa.assunto && (
                      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{etapa.assunto}</p>
                    )}
                    <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                      {etapa.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {empresas.length === 0 && !buscando && (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center", padding: 32 }}>
            Nenhuma pesquisa realizada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

const campoEstilo: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  padding: "9px 12px",
  fontSize: 13,
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-body)",
  background: "var(--bg)",
  color: "var(--ink)",
};

const botaoPrimario: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
  background: "var(--blueprint)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};

const botaoSecundario: React.CSSProperties = {
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 500,
  background: "transparent",
  color: "var(--blueprint)",
  border: "1px solid var(--blueprint)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};
