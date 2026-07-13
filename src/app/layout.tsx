import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "../lib/auth";
import { ThemeToggle, scriptAntiFlashTema } from "../components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeCasa OS",
  description: "Sistema Operacional Comercial Inteligente — DeCasa Esquadrias",
};

const ITENS_NAV = [
  { href: "/painel", label: "Painel" },
  { href: "/fila-do-dia", label: "Fila do dia" },
  { href: "/negociacoes", label: "Negociações" },
  { href: "/prospeccao", label: "Prospecção B2B" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessao = await auth();

  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiFlashTema }} />
      </head>
      <body>
        {sessao?.user ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <aside
              style={{
                width: 200,
                flexShrink: 0,
                borderRight: "1px solid var(--border)",
                padding: "20px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--blueprint)", padding: "0 8px 16px" }}>
                DeCasa OS
              </div>

              {ITENS_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ink-muted)",
                    textDecoration: "none",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {item.label}
                </Link>
              ))}

              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{sessao.user.name}</span>
                  <ThemeToggle />
                </div>
                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                >
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
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
