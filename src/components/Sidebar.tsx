"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const ITENS_NAV = [
  { href: "/painel", label: "Painel" },
  { href: "/agenda", label: "Agenda" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/fila-do-dia", label: "Fila do dia" },
  { href: "/negociacoes", label: "Negociações" },
  { href: "/relatorios", label: "Relatórios" },
];

export function Sidebar({
  nomeUsuario,
  acaoSair,
}: {
  nomeUsuario: string;
  acaoSair: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 208,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
        <Image src="/decasa-logo.png" alt="" width={26} height={26} style={{ objectFit: "contain" }} />
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--blueprint)" }}>
          DeCasa OS
        </span>
      </div>

      {ITENS_NAV.map((item) => (
        <Link key={item.href} href={item.href} className="nav-link" data-ativo={pathname === item.href}>
          {item.label}
        </Link>
      ))}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{nomeUsuario}</span>
          <ThemeToggle />
        </div>
        <form action={acaoSair}>
          <button
            type="submit"
            style={{
              width: "100%",
              fontSize: 12,
              color: "var(--ink-faint)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              padding: "0 8px",
            }}
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
