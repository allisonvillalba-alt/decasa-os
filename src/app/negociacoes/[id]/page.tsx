"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GaugeProbability } from "../../../components/GaugeProbability";
import { Carregando } from "../../../components/Carregando";

const ESTAGIOS = [
  { valor: "NOVO_LEAD", rotulo: "Novo lead" },
  { valor: "QUALIFICACAO", rotulo: "Qualificação" },
  { valor: "ORCAMENTO_ENVIADO", rotulo: "Orçamento enviado" },
  { valor: "NEGOCIACAO", rotulo: "Negociação" },
  { valor: "FECHADO_GANHO", rotulo: "Fechado — ganho" },
  { valor: "FECHADO_PERDIDO", rotulo: "Fechado — perdido" },
  { valor: "PAUSADO", rotulo: "Pausado" },
];

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Negociacao = {
  id: string;
  titulo: string;
  estagio: string;
  valorEstimado: number | null;
  probabilidade: number | null;
  motivoPerdido: string | null;
  responsavel: { id: string; nome: string };
  lead: { nome: string | null; telefone: string | null; email: string | null; interesseBruto: string | null } | null;
  contato: { nome: string; telefone: string | null; email: string | null; cargo: string | null } | null;
  empresa: { nome: string } | null;
  orcamentos: { id: string; versao: number; valorTotal: number; status: string; criadoEm: string }[];
  eventosTimeline: { id: string; tipo: string; descricao: string; criadoEm: string }[];
  followUps: { id: string; canal: string; status: string; dataAgendada: string; motivoPrioridade: string | null }[];
};

export default function PaginaDetalheNegociacao() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [neg, setNeg] = useState<Negociacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [estagio, setEstagio] = useState("");
  const [motivoPerdido, setMotivoPerdido] = useState("");

  useEffect(() => {
    fetch(`/api/negociacoes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("não encontrada");
        return r.json();
      })
      .then((dados: Negociacao) => {
        setNeg(dados);
        setTitulo(dados.titulo);
        setValorEstimado(dados.valorEstimado != null ? String(dados.valorEstimado) : "");
        setEstagio(dados.estagio);
        setMotivoPerdido(dados.motivoPerdido ?? "");
      })
      .catch(() => setErro("Não foi possível carregar esta negociação."))
      .finally(() => setCarregando(false));
  }, [id]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);

    const resp = await fetch(`/api/negociacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        valorEstimado: valorEstimado === "" ? null : Number(valorEstimado),
        estagio,
        motivoPerdido: motivoPerdido || undefined,
      }),
    });

    if (!resp.ok) {
      setErro("Não foi possível salvar as alterações.");
      setSalvando(false);
      return;
    }

    const atualizado = await resp.json();
    setNeg((atual) => (atual ? { ...atual, ...atualizado } : atual));
    setSalvo(true);
    setSalvando(false);
    setTimeout(() => setSalvo(false), 2500);
  }

  if (carregando) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <Carregando texto="Carregando negociação…" />
      </div>
    );
  }

  if (!neg) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <p style={{ color: "var(--danger)", fontSize: 14 }}>{erro ?? "Negociação não encontrada."}</p>
        <Link href="/negociacoes" className="nav-link" style={{ display: "inline-block", marginTop: 12 }}>
          ← Voltar para negociações
        </Link>
      </div>
    );
  }

  const nomeCliente = neg.contato?.nome ?? neg.lead?.nome ?? "Cliente sem nome";
  const telefoneCliente = neg.contato?.telefone ?? neg.lead?.telefone;
  const emailCliente = neg.contato?.email ?? neg.lead?.email;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 780, margin: "0 auto" }}>
      <button
        onClick={() => router.push("/negociacoes")}
        className="botao-secundario"
        style={{ marginBottom: 18, border: "none", padding: "4px 0", background: "none" }}
      >
        ← Voltar para negociações
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {neg.titulo}
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0" }}>
            Responsável: {neg.responsavel.nome}
          </p>
        </div>
        <GaugeProbability value={neg.probabilidade ?? 0} />
      </div>

      {/* Dados do cliente — somente leitura */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 18,
          marginBottom: 20,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 10px" }}>
          Cliente
        </h2>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{nomeCliente}</p>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "2px 0 0" }}>
          {[telefoneCliente, emailCliente].filter(Boolean).join(" · ") || "Sem contato registrado"}
        </p>
        {neg.empresa && (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "2px 0 0" }}>{neg.empresa.nome}</p>
        )}
        {neg.lead?.interesseBruto && (
          <p style={{ fontSize: 13, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>
            &ldquo;{neg.lead.interesseBruto}&rdquo;
          </p>
        )}
      </section>

      {/* Edição */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 18,
          marginBottom: 20,
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: 0 }}>
          Editar negociação
        </h2>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={rotuloEstilo}>Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo-input" />
        </label>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
            <span style={rotuloEstilo}>Valor estimado (R$)</span>
            <input
              type="number"
              min={0}
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
              className="campo-input"
              placeholder="0"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
            <span style={rotuloEstilo}>Estágio</span>
            <select value={estagio} onChange={(e) => setEstagio(e.target.value)} className="campo-input">
              {ESTAGIOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        {estagio === "FECHADO_PERDIDO" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={rotuloEstilo}>Motivo da perda</span>
            <input
              value={motivoPerdido}
              onChange={(e) => setMotivoPerdido(e.target.value)}
              className="campo-input"
              placeholder="Ex: preço, prazo, desistiu da obra…"
            />
          </label>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={salvar} disabled={salvando} className="botao-primario">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
          {salvo && <span style={{ fontSize: 13, color: "var(--success)" }}>Salvo.</span>}
          {erro && <span style={{ fontSize: 13, color: "var(--danger)" }}>{erro}</span>}
        </div>
      </section>

      {/* Orçamentos */}
      {neg.orcamentos.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            marginBottom: 20,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 10px" }}>
            Orçamentos
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {neg.orcamentos.map((o) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>
                  Versão {o.versao} · {o.status}
                </span>
                <span className="font-mono">{formatadorMoeda.format(o.valorTotal)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {neg.eventosTimeline.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 10px" }}>
            Histórico
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {neg.eventosTimeline.map((ev) => (
              <div key={ev.id} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                <span className="font-mono" style={{ color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                  {formatadorData.format(new Date(ev.criadoEm))}
                </span>
                <span style={{ color: "var(--ink-muted)" }}>{ev.descricao}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const rotuloEstilo: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
