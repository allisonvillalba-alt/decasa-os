/**
 * Indicador de carregamento padrão do sistema — um arco girando, o mesmo
 * motivo visual do manômetro de probabilidade e do "power-on" da tela de
 * login. Usado em toda tela que busca dado por fetch, pra sempre parecer
 * o mesmo sistema pensando, não um spinner genérico diferente por tela.
 */
export function Carregando({ texto }: { texto: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <svg width="18" height="18" viewBox="0 0 18 18" className="indicador-carregando-arco" aria-hidden="true">
        <circle cx="9" cy="9" r="7" fill="none" stroke="var(--border)" strokeWidth="2" />
        <path
          d="M 9 2 A 7 7 0 0 1 16 9"
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{texto}</span>
    </div>
  );
}
