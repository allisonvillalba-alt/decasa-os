"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Carregando } from "../../components/Carregando";
import { useToast } from "../../components/Toast";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: "BAIXA" | "MEDIA" | "ALTA";
  concluida: boolean;
  dataLimite: string | null;
  negociacao: { id: string; titulo: string } | null;
};

const COR_PRIORIDADE: Record<Tarefa["prioridade"], string> = {
  ALTA: "var(--danger)",
  MEDIA: "var(--signal)",
  BAIXA: "var(--ink-faint)",
};

const ROTULO_PRIORIDADE: Record<Tarefa["prioridade"], string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

function hojeEmZero() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PaginaTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<Tarefa["prioridade"]>("MEDIA");
  const [criando, setCriando] = useState(false);
  const { mostrarToast } = useToast();

  async function carregar() {
    const res = await fetch("/api/tarefas");
    const dados = await res.json();
    setTarefas(dados);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setCriando(true);
    await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: novoTitulo,
        prioridade: novaPrioridade,
        dataLimite: novaData ? new Date(novaData).toISOString() : undefined,
      }),
    });
    setNovoTitulo("");
    setNovaData("");
    setNovaPrioridade("MEDIA");
    setCriando(false);
    mostrarToast("Tarefa criada.");
    carregar();
  }

  async function concluir(id: string) {
    setTarefas((atual) => atual.filter((t) => t.id !== id));
    await fetch(`/api/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluida: true }),
    });
    mostrarToast("Tarefa concluída.");
  }

  if (carregando) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <Carregando texto="Carregando tarefas…" />
      </div>
    );
  }

  const hoje = hojeEmZero();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const atrasadas = tarefas.filter((t) => t.dataLimite && new Date(t.dataLimite) < hoje);
  const paraHoje = tarefas.filter(
    (t) => t.dataLimite && new Date(t.dataLimite) >= hoje && new Date(t.dataLimite) < amanha
  );
  const futuras = tarefas.filter((t) => t.dataLimite && new Date(t.dataLimite) >= amanha);
  const semPrazo = tarefas.filter((t) => !t.dataLimite);

  return (
    <div className="entrar-suave" style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Tarefas
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          {tarefas.length === 0 ? "Nenhuma tarefa pendente." : `${tarefas.length} tarefas pendentes.`}
        </p>
      </header>

      <form
        onSubmit={criarTarefa}
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          marginBottom: 24,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="Nova tarefa…"
          className="campo-input"
          style={{ flex: 2, minWidth: 180 }}
        />
        <input
          type="datetime-local"
          value={novaData}
          onChange={(e) => setNovaData(e.target.value)}
          className="campo-input"
          style={{ flex: 1, minWidth: 160 }}
        />
        <select value={novaPrioridade} onChange={(e) => setNovaPrioridade(e.target.value as Tarefa["prioridade"])} className="campo-input" style={{ flex: "0 0 110px" }}>
          <option value="BAIXA">Baixa</option>
          <option value="MEDIA">Média</option>
          <option value="ALTA">Alta</option>
        </select>
        <button type="submit" disabled={criando} className="botao-primario">
          {criando ? "…" : "Adicionar"}
        </button>
      </form>

      <SecaoTarefas titulo="Atrasadas" tarefas={atrasadas} corTitulo="var(--danger)" onConcluir={concluir} />
      <SecaoTarefas titulo="Hoje" tarefas={paraHoje} corTitulo="var(--blueprint)" onConcluir={concluir} />
      <SecaoTarefas titulo="Em breve" tarefas={futuras} onConcluir={concluir} />
      <SecaoTarefas titulo="Sem prazo" tarefas={semPrazo} onConcluir={concluir} />
    </div>
  );
}

function SecaoTarefas({
  titulo,
  tarefas,
  corTitulo,
  onConcluir,
}: {
  titulo: string;
  tarefas: Tarefa[];
  corTitulo?: string;
  onConcluir: (id: string) => void;
}) {
  if (tarefas.length === 0) return null;

  return (
    <section style={{ marginBottom: 22 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: corTitulo ?? "var(--ink-muted)",
          margin: "0 0 10px",
        }}
      >
        {titulo} <span className="font-mono" style={{ fontWeight: 500 }}>({tarefas.length})</span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tarefas.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <button
              onClick={() => onConcluir(t.id)}
              aria-label="Concluir tarefa"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: `2px solid ${COR_PRIORIDADE[t.prioridade]}`,
                background: "none",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background-color 0.15s var(--ease)",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>{t.titulo}</p>
              {t.negociacao && (
                <Link href={`/negociacoes/${t.negociacao.id}`} style={{ fontSize: 12, color: "var(--blueprint)" }}>
                  {t.negociacao.titulo}
                </Link>
              )}
            </div>
            {t.dataLimite && (
              <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                {new Date(t.dataLimite).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: COR_PRIORIDADE[t.prioridade] }}>
              {ROTULO_PRIORIDADE[t.prioridade]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
