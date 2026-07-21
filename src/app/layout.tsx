import type { Metadata } from "next";
import { auth, signOut } from "../lib/auth";
import { scriptAntiFlashTema } from "../components/ThemeToggle";
import { Sidebar } from "../components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeCasa OS",
  description: "Sistema Operacional Comercial Inteligente — DeCasa Esquadrias",
};

async function sair() {
  "use server";
  await signOut();
}

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
            <Sidebar nomeUsuario={sessao.user.name ?? ""} acaoSair={sair} />
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
