/**
 * Blocos de carregamento que "respiram" no lugar do conteúdo real, pra tela
 * nunca parecer parada/morta enquanto o dado ainda não chegou.
 */
export function SkeletonLinha({ largura = "100%", altura = 14 }: { largura?: string | number; altura?: number }) {
  return <div className="esqueleto" style={{ width: largura, height: altura }} />;
}

export function SkeletonCartaoNegociacao() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <SkeletonLinha largura="80%" />
      <SkeletonLinha largura="45%" altura={18} />
      <SkeletonLinha largura="60%" altura={11} />
    </div>
  );
}

export function SkeletonColunaKanban() {
  return (
    <div style={{ minWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <SkeletonLinha largura="70%" altura={12} />
      <SkeletonCartaoNegociacao />
      <SkeletonCartaoNegociacao />
    </div>
  );
}
