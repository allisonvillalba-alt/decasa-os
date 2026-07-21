"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Carregando } from "../../components/Carregando";

type ItemAgenda = {
  id: string;
  tipo: "follow_up" | "tarefa";
  titulo: string;
  data: string;
  canal?: string;
  prioridade?: "BAIXA" | "MEDIA" | "ALTA";
  negociacaoId: string | null;
};

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function PaginaAgenda() {
  const [itens, setItens] = useState<ItemAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(new Date());

  useEffect(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }, []);

  const itensPorDia = useMemo(() => {
    const mapa = new Map<string, ItemAgenda[]>();
    for (const item of itens) {
      const chave = chaveDia(new Date(item.data));
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(item);
    }
    return mapa;
  }, [itens]);

  const celulas = useMemo(() => {
    const primeiroDiaSemana = mesAtual.getDay();
    const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
    const lista: (Date | null)[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) lista.push(null);
    for (let d = 1; d <= diasNoMes; d++) lista.push(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), d));
    return lista;
  }, [mesAtual]);

  if (carregando) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24 }}>
        <Carregando texto="Montando a agenda…" />
      </div>
    );
  }

  const hoje = new Date();
  const itensDoDia = itensPorDia.get(chaveDia(diaSelecionado)) ?? [];

  return (
    <div className="entrar-suave" style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Agenda
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          Follow-ups e tarefas com prazo, num lugar só.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button
              className="botao-secundario"
              onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              ←
            </button>
            <span className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
              {NOMES_MES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
            </span>
            <button
              className="botao-secundario"
              onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", padding: 4 }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {celulas.map((dia, i) => {
              if (!dia) return <div key={i} />;
              const itensDia = itensPorDia.get(chaveDia(dia)) ?? [];
              const ehHoje = chaveDia(dia) === chaveDia(hoje);
              const selecionado = chaveDia(dia) === chaveDia(diaSelecionado);

              return (
                <button
                  key={i}
                  onClick={() => setDiaSelecionado(dia)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: "var(--radius-sm)",
                    border: ehHoje ? "1.5px solid var(--blueprint)" : "1px solid transparent",
                    background: selecionado ? "var(--blueprint-tint)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    transition: "background-color 0.15s var(--ease), transform 0.15s var(--ease)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span style={{ fontSize: 13, color: ehHoje ? "var(--blueprint)" : "var(--ink)", fontWeight: ehHoje ? 700 : 400 }}>
                    {dia.getDate()}
                  </span>
                  {itensDia.length > 0 && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {itensDia.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: item.tipo === "follow_up" ? "var(--blueprint)" : "var(--signal)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            boxShadow: "var(--shadow-card)",
            alignSelf: "start",
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>
            {diaSelecionado.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </h2>

          {itensDoDia.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Nada agendado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {itensDoDia
                .sort((a, b) => a.data.localeCompare(b.data))
                .map((item) => (
                  <div key={item.id} style={{ fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: item.tipo === "follow_up" ? "var(--blueprint)" : "var(--signal)",
                          flexShrink: 0,
                        }}
                      />
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                        {new Date(item.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {item.negociacaoId ? (
                      <Link href={`/negociacoes/${item.negociacaoId}`} style={{ color: "var(--ink)", fontWeight: 500 }}>
                        {item.titulo}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{item.titulo}</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
