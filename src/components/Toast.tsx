"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type TipoToast = "sucesso" | "erro";

type ItemToast = { id: number; texto: string; tipo: TipoToast; saindo?: boolean };

const ToastContext = createContext<{ mostrarToast: (texto: string, tipo?: TipoToast) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([]);
  const proximoId = useRef(0);

  const mostrarToast = useCallback((texto: string, tipo: TipoToast = "sucesso") => {
    const id = proximoId.current++;
    setItens((atual) => [...atual, { id, texto, tipo }]);

    setTimeout(() => {
      setItens((atual) => atual.map((i) => (i.id === id ? { ...i, saindo: true } : i)));
    }, 2400);

    setTimeout(() => {
      setItens((atual) => atual.filter((i) => i.id !== id));
    }, 2700);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 1000,
        }}
      >
        {itens.map((item) => (
          <div
            key={item.id}
            className="toast"
            data-saindo={item.saindo}
            style={{
              background: item.tipo === "erro" ? "var(--danger)" : "var(--ink)",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 500,
              boxShadow: "var(--shadow-pop)",
              maxWidth: 320,
            }}
          >
            {item.texto}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de um ToastProvider");
  return ctx;
}
