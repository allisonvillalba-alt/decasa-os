"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

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
      className="blueprint-grid"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
            <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border)" strokeWidth="1" />
            <circle
              className="logo-power-on-arc"
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="276.5"
              strokeDashoffset="276.5"
              transform="rotate(-90 48 48)"
            />
          </svg>
          <Image src="/decasa-logo.png" alt="DeCasa" width={62} height={62} style={{ objectFit: "contain" }} priority />
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--blueprint)", letterSpacing: "-0.01em" }}>
            DeCasa OS
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0" }}>
            Sistema Operacional Comercial
          </p>
        </div>

        <form
          onSubmit={entrar}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 28,
            width: "100%",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={rotuloEstilo}>E-mail</span>
            <input
              type="email"
              required
              autoFocus
              placeholder="voce@decasa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="campo-input"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={rotuloEstilo}>Senha</span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="campo-input"
            />
          </label>

          {erro && (
            <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{erro}</p>
          )}

          <button type="submit" disabled={enviando} className="botao-primario">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="font-mono" style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0, letterSpacing: "0.02em" }}>
          DECASA ESQUADRIAS · SISTEMA INTERNO
        </p>
      </div>
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
