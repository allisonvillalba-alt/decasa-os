"use client";

/**
 * Medidor de probabilidade de fechamento — desenhado como um manômetro
 * industrial (arco de 270°), não como uma barra de progresso genérica.
 * É o elemento de assinatura visual do sistema: remete ao universo de
 * oficina/painel de máquina da própria DeCasa.
 */
export function GaugeProbability({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const startAngle = -225; // graus
  const sweep = 270;
  const angle = startAngle + (sweep * clamped) / 100;

  const size = 44;
  const radius = 16;
  const cx = size / 2;
  const cy = size / 2;

  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  const arcPath = (fromDeg: number, toDeg: number) => {
    const [x1, y1] = toXY(fromDeg);
    const [x2, y2] = toXY(toDeg);
    const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const color =
    clamped >= 60 ? "var(--success)" : clamped >= 30 ? "var(--signal)" : "var(--ink-faint)";

  return (
    <div style={{ position: "relative", width: size, height: size }} title={`${clamped}% de probabilidade`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={arcPath(startAngle, startAngle + sweep)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d={arcPath(startAngle, angle)}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-mono"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 500,
          color: "var(--ink-muted)",
        }}
      >
        {clamped}
      </span>
    </div>
  );
}
