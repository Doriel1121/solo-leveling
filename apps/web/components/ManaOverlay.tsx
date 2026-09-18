/**
 * Abstract electric-blue mana wrap. Screen-blended over any still so a Gemini
 * image quota is not required for the glow-up.
 */
export function ManaOverlay({
  variant,
}: {
  variant: "blue" | "shadow" | "burst";
}) {
  const burst = variant === "burst";
  const shadow = variant === "shadow";
  return (
    <svg
      className={`fx-mana-plate ${shadow ? "fx-mana-plate--shadow" : ""} ${burst ? "fx-mana-plate--burst" : ""}`}
      viewBox="0 0 768 1024"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="manaCore" cx="50%" cy="62%" r="48%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.7" />
          <stop offset="28%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="58%" stopColor="#0284c7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="manaEyes" cx="50%" cy="34%" r="18%">
          <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="manaViolet" cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="768" height="1024" fill="black" opacity="0" />
      <ellipse
        cx="384"
        cy="640"
        rx={burst ? 280 : 220}
        ry={burst ? 420 : 340}
        fill={shadow ? "url(#manaViolet)" : "url(#manaCore)"}
      />
      <ellipse cx="384" cy="360" rx="90" ry="70" fill="url(#manaEyes)" />
    </svg>
  );
}
