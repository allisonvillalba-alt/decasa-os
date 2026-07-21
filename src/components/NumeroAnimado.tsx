"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima um número subindo do zero até o valor real quando ele chega —
 * um toque pequeno de "vida" nos números grandes do painel/relatórios,
 * em vez de simplesmente aparecerem estáticos.
 */
export function NumeroAnimado({
  valor,
  formatar,
}: {
  valor: number;
  formatar: (v: number) => string;
}) {
  const [exibido, setExibido] = useState(0);
  const inicioRef = useRef<number | null>(null);
  const valorAnteriorRef = useRef(0);

  useEffect(() => {
    const de = valorAnteriorRef.current;
    const duracaoMs = 600;
    inicioRef.current = null;

    let quadro: number;
    function passo(tempo: number) {
      if (inicioRef.current === null) inicioRef.current = tempo;
      const progresso = Math.min((tempo - inicioRef.current) / duracaoMs, 1);
      const suavizado = 1 - Math.pow(1 - progresso, 3); // ease-out-cubic
      setExibido(de + (valor - de) * suavizado);
      if (progresso < 1) {
        quadro = requestAnimationFrame(passo);
      } else {
        valorAnteriorRef.current = valor;
      }
    }
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);

  return <>{formatar(Math.round(exibido))}</>;
}
