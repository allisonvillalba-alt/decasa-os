"use client";

import { useEffect, useState } from "react";
import { Carregando } from "../../components/Carregando";

/**
 * FILA DO DIA
 * A tela que o vendedor abre às 8h da manhã. Responde:
 * quem contatar, em que ordem, por qual canal, POR QUÊ — e já com a
 * mensagem escrita, esperando só revisão e envio.
 */

type ItemFila = {
  id: string;
  canal: "WHATSAPP" | "LIGACAO" | "EMAIL" | "VISITA";
  prioridade: number;
  motivoPrioridade: string | null;
  mensagemSugerida: string | null;
  status: string;
  negociacao: {
    id: string;
    titulo: string;
    valorEstimado: number | null;
    lead: { nome: string | null; telefone: string | null } | null;
    contato: { nome: string | null; telefone: string | null } | null;
  };
};

const ROTULO_CANAL: Record<ItemFila["canal"], string> = {
  WHATSAPP: "WhatsApp",
  LIGACAO: "Ligar",
  EMAIL: "E-mail",
  VISITA: "Visitar",
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function PaginaFilaDoDia() {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPara, setGerandoPara] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fila-do-dia")
      .then((r) => r.json())
      .then(setFila)
      .finally(() => setCarregando(false));
  }, []);

  async function concluir(followUpId: string) {
    setFila((f) => f.filter((item) => item.id !== followUpId));
    await fetch("/api/fila-do-dia", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId, acao: "concluir" }),
    });
  }

  async function gerarMensagem(followUpId: string) {
    setGerandoPara(followUpId);
    const resp = await fetch("/api/fila-do-dia", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId, acao: "gerar_mensagem" }),
    });
    const atualizado = await resp.json();
    setFila((f) =>
      f.map((item) =>
        item.id === followUpId
          ? { ...item, mensagemSugerida: atualizado.mensagemSugerida }
          : item
      )
    );
    setGerandoPara(null);
  }

  function copiarMensagem(texto: string) {
    navigator.clipboard.writeText(texto);
  }

  const totalEmJogo = fila.reduce(
    (s, item) => s + (item.negociacao.valorEstimado ?? 0),
    0
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Fila do dia
        </h1>
        {carregando ? (
          <div style={{ marginTop: 6 }}>
            <Carregando texto="Montando sua fila…" />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
            {fila.length === 0
              ? "Tudo em dia. Nenhum cliente esperando follow-up."
              : `${fila.length} clientes precisam de você hoje — ${formatadorMoeda.format(totalEmJogo)} em negociações.`}
          </p>
        )}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fila.map((item, indice) => {
          const nome =
            item.negociacao.contato?.nome ??
            item.negociacao.lead?.nome ??
            "Cliente sem nome";

          return (
            <div
              key={item.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: indice === 0 ? "3px solid var(--signal)" : "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{nome}</span>
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
                      {ROTULO_CANAL[item.canal]}
                    </span>
                    {item.status === "ATRASADO" && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--danger-tint)",
                          color: "var(--danger)",
                        }}
                      >
                        Atrasado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0" }}>
                    {item.negociacao.titulo}
                    {item.negociacao.valorEstimado
                      ? ` · ${formatadorMoeda.format(item.negociacao.valorEstimado)}`
                      : ""}
                  </p>
                </div>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  #{indice + 1}
                </span>
              </div>

              {item.motivoPrioridade && (
                <p style={{ fontSize: 13, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.45 }}>
                  {item.motivoPrioridade}
                </p>
              )}

              {item.mensagemSugerida ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "var(--blueprint-tint)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {item.mensagemSugerida}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {item.mensagemSugerida ? (
                  <button onClick={() => copiarMensagem(item.mensagemSugerida!)} className="botao-primario">
                    Copiar mensagem
                  </button>
                ) : (
                  <button
                    onClick={() => gerarMensagem(item.id)}
                    disabled={gerandoPara === item.id}
                    className="botao-primario"
                  >
                    {gerandoPara === item.id ? "Escrevendo…" : "Gerar mensagem"}
                  </button>
                )}
                <button onClick={() => concluir(item.id)} className="botao-secundario">
                  Marcar como feito
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
