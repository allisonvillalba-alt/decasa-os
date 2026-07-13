"use client";

import { useEffect, useState } from "react";

/**
 * Alternância dark/light. Usa localStorage para lembrar a preferência entre
 * sessões (isso é código real da aplicação Next.js — não um artifact do
 * Claude, então localStorage é a ferramenta certa aqui) e aplica o atributo
 * data-theme no <html>, que já é o que globals.css espera.
 */
export function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const salvo = (localStorage.getItem("decasa-theme") as "light" | "dark") ?? "light";
    setTema(salvo);
    document.documentElement.setAttribute("data-theme", salvo);
  }, []);

  function alternar() {
    const novo = tema === "light" ? "dark" : "light";
    setTema(novo);
    document.documentElement.setAttribute("data-theme", novo);
    localStorage.setItem("decasa-theme", novo);
  }

  return (
    <button
      onClick={alternar}
      aria-label="Alternar tema claro/escuro"
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
        color: "var(--ink-muted)",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {tema === "light" ? "🌙" : "☀️"}
    </button>
  );
}

/**
 * Script inline para evitar "flash" de tema errado no primeiro paint.
 * Deve ser colocado no <head> do layout raiz, antes de qualquer CSS renderizar.
 */
export const scriptAntiFlashTema = `
(function() {
  try {
    var tema = localStorage.getItem('decasa-theme') || 'light';
    document.documentElement.setAttribute('data-theme', tema);
  } catch (e) {}
})();
`;
