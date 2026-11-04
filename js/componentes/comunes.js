/* ============================================================
   Guardia Vet MDP · componentes/comunes.js
   Componentes de React chicos que se reutilizan en muchas pantallas:
   íconos, dibujos, encabezado, barra de abajo, campos de formulario...
   ============================================================ */

const ICONOS = {
  buscar: ['<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>', false],
  mascota: ['<circle cx="6.5" cy="10" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="17.5" cy="10" r="2"/><path d="M7.5 17.5c0-3.2 2.2-5.5 4.5-5.5s4.5 2.3 4.5 5.5c0 2-2.2 2.5-4.5 2.5s-4.5-.5-4.5-2.5z"/>', true],
  turnos: ['<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', false],
  cuenta: ['<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', false],
  pacientes: ['<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/>', false],
  horarios: ['<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', false],
  donantes: ['<path d="M12 3c3 4.5 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 3-6.5 6-11z"/>', false],
};
function Icon({ n }) {
  const [d, fill] = ICONOS[n];
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />;
}
// Logo: huellita con una cruz veterinaria en la almohadilla
function Cruz({ size = 28 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <g fill="currentColor"><circle cx="5.5" cy="9.5" r="2.3" /><circle cx="9.5" cy="4.8" r="2.3" /><circle cx="14.5" cy="4.8" r="2.3" /><circle cx="18.5" cy="9.5" r="2.3" />
      <path d="M6.5 17.2c0-3.6 2.6-6.4 5.5-6.4s5.5 2.8 5.5 6.4c0 2.5-2.6 3.3-5.5 3.3s-5.5-.8-5.5-3.3z" /></g>
    <path d="M11 13.4h2v1.6h1.6v2H13v1.6h-2V17H9.4v-2H11z" fill="var(--vet)" />
  </svg>;
}

// Dibujo de bienvenida: un perro que mueve la cola y un gato, con un corazón que flota (dibujo propio en SVG)
function Ilustracion() {
  return <svg className="ilus" viewBox="0 0 240 150" role="img" aria-label="Dibujo de un perro y un gato sentados">
    <ellipse cx="122" cy="141" rx="98" ry="6" fill="var(--line)" />
    {/* perro */}
    <g className="cola-perro"><path d="M52 101 Q36 92 35 75" stroke="var(--perro)" strokeWidth="8" fill="none" strokeLinecap="round" /></g>
    <ellipse cx="70" cy="110" rx="27" ry="23" fill="var(--perro)" />
    <rect x="56" y="118" width="10" height="20" rx="5" fill="var(--perro)" />
    <rect x="77" y="118" width="10" height="20" rx="5" fill="var(--perro)" />
    <circle cx="88" cy="78" r="22" fill="var(--perro)" />
    <ellipse cx="69" cy="78" rx="8" ry="16" fill="var(--perro-osc)" transform="rotate(18 69 78)" />
    <ellipse cx="107" cy="78" rx="8" ry="16" fill="var(--perro-osc)" transform="rotate(-18 107 78)" />
    <ellipse cx="89" cy="89" rx="11" ry="8" fill="var(--hocico)" />
    <path d="M86 94 q3 8 6 0z" fill="#e0444a" />
    <ellipse cx="89" cy="85" rx="4.5" ry="3.3" fill="var(--tinta)" />
    <g className="ojos"><circle cx="80" cy="74" r="2.7" fill="var(--tinta)" /><circle cx="98" cy="74" r="2.7" fill="var(--tinta)" /></g>
    <path d="M74 97 q15 7 30 -1" stroke="var(--vet)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <circle cx="89" cy="104" r="3.6" fill="var(--sol)" />
    {/* gato */}
    <g className="cola-gato"><path d="M188 121 Q216 117 210 93 Q207 81 216 74" stroke="var(--gato)" strokeWidth="7" fill="none" strokeLinecap="round" /></g>
    <ellipse cx="168" cy="113" rx="22" ry="24" fill="var(--gato)" />
    <ellipse cx="160" cy="136" rx="7" ry="4.5" fill="var(--gato-osc)" />
    <ellipse cx="176" cy="136" rx="7" ry="4.5" fill="var(--gato-osc)" />
    <path d="M148 72 L150 49 L164 62 Z" fill="var(--gato)" />
    <path d="M182 72 L180 49 L166 62 Z" fill="var(--gato)" />
    <path d="M151 66 L152 55 L159 62 Z" fill="#f2b7c4" />
    <path d="M179 66 L178 55 L171 62 Z" fill="#f2b7c4" />
    <circle cx="165" cy="79" r="19" fill="var(--gato)" />
    <g className="ojos g"><ellipse cx="158" cy="77" rx="2.5" ry="3.4" fill="var(--tinta)" /><ellipse cx="172" cy="77" rx="2.5" ry="3.4" fill="var(--tinta)" /></g>
    <path d="M162.5 84 h5 l-2.5 3z" fill="#e0444a" />
    <path d="M152 85 h-11 M152 88.5 l-10 3.5 M178 85 h11 M178 88.5 l10 3.5" stroke="var(--tinta)" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
    {/* globo con cruz y corazón */}
    <g className="flota">
      <circle cx="127" cy="32" r="15" fill="var(--surface)" stroke="var(--vet)" strokeWidth="2.5" />
      <path d="M124 23.5h6v5.5h5.5v6H130v5.5h-6V35h-5.5v-6h5.5z" fill="var(--vet)" />
    </g>
    <path className="corazon" d="M118 62 c-3-4-9-1-6 4 l6 6 6-6 c3-5-3-8-6-4z" fill="#e0444a" />
  </svg>;
}

// Carita según la especie, para los avatares de las mascotas
function CaraMascota({ especie }) {
  const t = "var(--tinta)";
  if (especie === "Perro") return <svg viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="9" cy="19" rx="5" ry="10" fill="var(--perro-osc)" transform="rotate(15 9 19)" />
    <ellipse cx="31" cy="19" rx="5" ry="10" fill="var(--perro-osc)" transform="rotate(-15 31 19)" />
    <circle cx="20" cy="21" r="13" fill="var(--perro)" />
    <ellipse cx="20" cy="27" rx="7" ry="5" fill="var(--hocico)" />
    <ellipse cx="20" cy="24.5" rx="3" ry="2.2" fill={t} />
    <circle cx="15" cy="18" r="1.8" fill={t} /><circle cx="25" cy="18" r="1.8" fill={t} />
  </svg>;
  if (especie === "Gato") return <svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M8 18 L9 4 L18 11 Z" fill="var(--gato)" /><path d="M32 18 L31 4 L22 11 Z" fill="var(--gato)" />
    <circle cx="20" cy="22" r="13" fill="var(--gato)" />
    <ellipse cx="15" cy="20" rx="1.8" ry="2.5" fill={t} /><ellipse cx="25" cy="20" rx="1.8" ry="2.5" fill={t} />
    <path d="M18.3 25 h3.4 l-1.7 2z" fill="#e0444a" />
    <path d="M12 26 h-7 M12 28.5 l-6 2.5 M28 26 h7 M28 28.5 l6 2.5" stroke={t} strokeWidth="1" opacity=".5" />
  </svg>;
  if (especie === "Ave") return <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="21" r="13" fill="var(--sol)" />
    <path d="M14 8 q4-6 6 2 q3-6 5 1" stroke="var(--sol)" strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="16" cy="19" r="2" fill={t} /><circle cx="24" cy="19" r="2" fill={t} />
    <path d="M17 24 h6 l-3 5z" fill="#e8782d" />
  </svg>;
  if (especie === "Conejo") return <svg viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="14" cy="10" rx="4" ry="10" fill="var(--hocico)" /><ellipse cx="26" cy="10" rx="4" ry="10" fill="var(--hocico)" />
    <ellipse cx="14" cy="10" rx="1.8" ry="7" fill="#f2b7c4" /><ellipse cx="26" cy="10" rx="1.8" ry="7" fill="#f2b7c4" />
    <circle cx="20" cy="25" r="11" fill="var(--hocico)" />
    <circle cx="16" cy="23" r="1.8" fill={t} /><circle cx="24" cy="23" r="1.8" fill={t} />
    <path d="M18.5 27 h3 l-1.5 1.8z" fill="#e0444a" />
  </svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="var(--ok)"><circle cx="6" cy="10" r="2.2" /><circle cx="10" cy="5.5" r="2.2" />
    <circle cx="14" cy="5.5" r="2.2" /><circle cx="18" cy="10" r="2.2" /><path d="M7.5 17.5c0-3.2 2.2-5.5 4.5-5.5s4.5 2.3 4.5 5.5c0 2-2.2 2.5-4.5 2.5s-4.5-.5-4.5-2.5z" /></g></svg>;
}

// Animación de carga: huellitas que caminan
function Huellitas() {
  return <div className="huellitas" role="status" aria-label="Cargando"><span></span><span></span><span></span><span></span></div>;
}

function Top({ sub }) {
  return <header className="top"><div className="topin"><span className="cross"><Cruz /></span>
    <div><div className="tt">Guardia Vet MDP</div><div className="ts">{sub}</div></div></div></header>;
}
function BottomNav({ tabs, tab, setTab }) {
  return <nav className="bottom" aria-label="Secciones">
    <div className="bar" style={{ gridTemplateColumns: "repeat(" + tabs.length + ",1fr)" }}>
      {tabs.map(t => <button key={t.k} aria-current={tab === t.k ? "page" : undefined} onClick={() => { setTab(t.k); window.scrollTo(0, 0); }}>
        <span className="ic"><Icon n={t.i} />{t.badge > 0 && <span className="dot">{t.badge}</span>}</span><span>{t.l}</span>
      </button>)}
    </div>
  </nav>;
}
function Campo({ label, error, children }) {
  return <label className={"field" + (error ? " err" : "")}>{label}{children}{error && <span className="errtxt">{error}</span>}</label>;
}
function Sheet({ onClose, titulo, children }) {
  return <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}>{children}</div>
  </div>;
}
const HORAS = Array.from({ length: 25 }, (_, i) => i);
function SelHora({ id, value, onChange, conCerrado, label }) {
  return <select id={id} aria-label={label} value={value} onChange={onChange}>
    {conCerrado && <option value="">Cerrado</option>}
    {HORAS.map(h => <option key={h} value={String(h)}>{hhmm(h)}</option>)}
  </select>;
}
// Lista de requisitos que se van tildando mientras se escribe la contraseña
function ReglasPass({ pass }) {
  return <ul className="reglas" aria-label="Requisitos de la contraseña">
    {REGLAS_PASS.map(r => { const ok = r.ok(pass); return <li key={r.t} className={ok ? "ok" : ""}>
      <span className="tilde" aria-hidden="true">{ok ? "✓" : ""}</span>{r.t}<span className="sr">{ok ? " (cumplido)" : " (falta)"}</span>
    </li>; })}
  </ul>;
}

const inicial = m => <CaraMascota especie={m.especie} />;
const claseAvatar = m => "avatar" + (m.especie === "Gato" ? " gato" : m.especie === "Perro" ? "" : " otro");
