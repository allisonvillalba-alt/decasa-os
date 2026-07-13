"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function PaginaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const resp = await signIn("credentials", { email, senha, redirect: false });

    if (resp?.ok) {
      router.push("/painel");
      router.refresh();
    } else {
      setErro("E-mail ou senha incorretos.");
    }
    setEnviando(false);
  }

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={entrar}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 32,
          width: "100%",
          maxWidth: 360,
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <h1 className="font-display" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--blueprint)" }}>
            DeCasa OS
          </h1>
          <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 0" }}>
            Sistema Operacional Comercial
          </p>
        </div>

        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={campoEstilo}
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={campoEstilo}
        />

        {erro && (
          <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{erro}</p>
        )}

        <button type="submit" disabled={enviando} style={botaoEstilo}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const campoEstilo: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-body)",
  background: "var(--bg)",
  color: "var(--ink)",
};

const botaoEstilo: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 600,
  background: "var(--blueprint)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  marginTop: 6,
};
