"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/Toast";

const PRODUTOS = ["Janela", "Porta", "Porta de correr", "Guarda-corpo", "Fachada", "Outro"];

export default function PaginaNovaNegociacao() {
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [produto, setProduto] = useState(PRODUTOS[0]);
  const [valorEstimado, setValorEstimado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const resp = await fetch("/api/negociacoes/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        telefone: telefone || undefined,
        email: email || undefined,
        produtoInteresse: produto,
        valorEstimado: valorEstimado ? Number(valorEstimado) : undefined,
        observacao: observacao || undefined,
      }),
    });

    if (!resp.ok) {
      setErro("Não foi possível cadastrar. Confira os dados.");
      setSalvando(false);
      return;
    }

    const { negociacaoId } = await resp.json();
    mostrarToast("Lead cadastrado com sucesso.");
    router.push(`/negociacoes/${negociacaoId}`);
  }

  return (
    <div
      className="entrar-suave"
      style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 560, margin: "0 auto" }}
    >
      <button onClick={() => router.push("/negociacoes")} className="botao-secundario" style={{ marginBottom: 18, border: "none", padding: "4px 0", background: "none" }}>
        ← Voltar para negociações
      </button>

      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>
        Novo lead
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "0 0 24px" }}>
        Cadastro manual — sem precisar esperar WhatsApp ou importação.
      </p>

      <form
        onSubmit={salvar}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 22,
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Campo rotulo="Nome do cliente">
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="campo-input" placeholder="Ex: Maria Silva" />
        </Campo>

        <div style={{ display: "flex", gap: 14 }}>
          <Campo rotulo="Telefone">
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="campo-input" placeholder="(11) 99999-9999" />
          </Campo>
          <Campo rotulo="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="campo-input" placeholder="opcional" />
          </Campo>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <Campo rotulo="Produto de interesse">
            <select value={produto} onChange={(e) => setProduto(e.target.value)} className="campo-input">
              {PRODUTOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Valor estimado (R$)">
            <input type="number" min={0} value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} className="campo-input" placeholder="opcional" />
          </Campo>
        </div>

        <Campo rotulo="Observação">
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="campo-input"
            rows={3}
            placeholder="O que o cliente pediu, contexto da obra, etc."
            style={{ resize: "vertical", fontFamily: "var(--font-body)" }}
          />
        </Campo>

        {erro && <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{erro}</p>}

        <button type="submit" disabled={salvando} className="botao-primario">
          {salvando ? "Cadastrando…" : "Cadastrar lead"}
        </button>
      </form>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {rotulo}
      </span>
      {children}
    </label>
  );
}
