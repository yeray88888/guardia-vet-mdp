/* ============================================================
   Guardia Vet MDP · utilidades.js
   Funciones de JavaScript puro (sin React): distancias del mapa, fechas,
   horarios de atención, edad de las mascotas, vacunas y reglas de contraseña.
   ============================================================ */

/* ---------- mapa ---------- */
const CENTRO_MDP = { lat: -38.0023, lng: -57.5575, real: false }; // Plaza San Martín
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OPCIONES_TILES = { maxZoom: 19, referrerPolicy: "strict-origin-when-cross-origin", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' };
const hayMapa = () => typeof window.L !== "undefined";
// Agrega las calles de OpenStreetMap y avisa si las imágenes no cargan (por ejemplo, sin internet)
function agregarCalles(mapa, alFallar) {
  let avisado = false;
  L.tileLayer(TILES, OPCIONES_TILES).on("tileerror", () => { if (!avisado) { avisado = true; alFallar(); } }).addTo(mapa);
}

// Distancia en km entre dos puntos (fórmula de Haversine)
function distanciaKm(a, b) {
  const rad = x => x * Math.PI / 180, R = 6371;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const iconoPin = (texto, clase) => L.divIcon({ className: "", html: `<span class="pin ${clase}">${texto}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });

// Nominatim: dirección → coordenadas
async function buscarDireccion(direccion) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=" +
    encodeURIComponent(direccion + ", Mar del Plata, Buenos Aires");
  const r = await fetch(url, { headers: { "Accept-Language": "es" } });
  const j = await r.json();
  return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
}
const linkComoLlegar = v => "https://www.google.com/maps/dir/?api=1&destination=" + v.lat + "," + v.lng;

/* ---------- fechas y horarios ---------- */
const fechaISO = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const sumarDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const deISO = iso => new Date(iso + "T12:00:00");
function fechaCorta(iso) {
  if (iso === fechaISO(new Date())) return "Hoy";
  if (iso === fechaISO(sumarDias(1))) return "Mañana";
  const d = deISO(iso); return DIAS_CORTOS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()];
}
const hhmm = h => String(h).padStart(2, "0") + ":00";
const mmTexto = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
// H(20, 8) → [[20,24],[0,8]]: un horario que cruza la medianoche se parte en dos franjas
const H = (a, b) => a === b ? [] : a < b ? [[a, b]] : [[a, 24], [0, b]];
// c y g: { semana, finde, domingo? }. Si no se indica domingo, usa el mismo horario que el sábado.
function armarHorario(c, g) {
  return Array.from({ length: 7 }, (_, d) => {
    const finde = d === 0 || d === 6;
    const elegir = x => d === 0 && x.domingo !== undefined ? x.domingo : finde ? x.finde : x.semana;
    return { consulta: copia(elegir(c)), guardia: copia(elegir(g)) };
  });
}
// Franjas de un día concreto, teniendo en cuenta los días especiales
function rangos(v, fecha, tipo) {
  const iso = fechaISO(fecha);
  const ex = (v.excepciones || []).find(e => e.fecha === iso && (e.aplica === "ambos" || e.aplica === tipo));
  if (ex) return { r: ex.cerrado ? [] : [[ex.abre, ex.cierra]], ex };
  return { r: v.horario[fecha.getDay()][tipo], ex: null };
}
const dentro = (r, hora) => r.some(([a, b]) => hora >= a && hora < b);
const abiertaAhora = (v, ahora) => v.abierta && dentro(rangos(v, ahora.fecha, "guardia").r, ahora.hora);
const abiertaNormal = (v, ahora) => dentro(rangos(v, ahora.fecha, "consulta").r, ahora.hora);
const rangosTexto = r => r.length === 0 ? "" : r.some(([a, b]) => a === 0 && b === 24) ? "las 24 h" : r.map(([a, b]) => hhmm(a) + " a " + hhmm(b)).join(" y ");
function horarioDelDia(v, fecha, tipo) {
  const { r, ex } = rangos(v, fecha, tipo);
  return { texto: rangosTexto(r) || (ex ? "cerrado" : tipo === "guardia" ? "no hace guardia" : "sin atención"), ex };
}
function slotsDe(r, desde) {
  const s = [];
  r.forEach(([a, b]) => { for (let m = a * 60; m < b * 60; m += 30) { if (m >= desde) s.push(m); } });
  return s;
}
function validarHorario(h) {
  for (const d of ORDEN_DIAS) {
    for (const tipo of ["consulta", "guardia"]) {
      const f = [...h[d][tipo]].sort((x, y) => x[0] - y[0]);
      for (let i = 0; i < f.length; i++) {
        if (f[i][0] >= f[i][1]) return "El " + DIAS[d].toLowerCase() + " hay una franja donde el cierre no es después de la apertura.";
        if (i > 0 && f[i][0] < f[i - 1][1]) return "El " + DIAS[d].toLowerCase() + " hay franjas de " + (tipo === "guardia" ? "guardia" : "consultas") + " que se superponen.";
      }
    }
  }
  return "";
}
const ordenarHorario = h => h.map(d => ({ consulta: [...d.consulta].sort((a, b) => a[0] - b[0]), guardia: [...d.guardia].sort((a, b) => a[0] - b[0]) }));

/* ---------- mascotas ---------- */
function mesesDesde(ym) {
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number); const d = new Date();
  return (d.getFullYear() - y) * 12 + (d.getMonth() + 1 - m);
}
function edadTexto(nac) {
  const meses = mesesDesde(nac);
  if (meses === null) return "Edad sin cargar";
  if (meses < 12) return meses + (meses === 1 ? " mes" : " meses");
  const a = Math.floor(meses / 12); return a + (a === 1 ? " año" : " años");
}
const mesTexto = ym => { if (!ym) return "Sin cargar"; const [y, m] = ym.split("-"); return MESES[+m - 1] + " " + y; };
function vacunaEstado(ym) {
  const m = mesesDesde(ym);
  if (m === null) return { t: "Sin cargar", c: "no" };
  return m > 12 ? { t: "Vencida", c: "alert" } : { t: "Al día", c: "ok" };
}
const nombreVacuna = esp => esp === "Perro" ? "Séxtuple / quíntuple" : esp === "Gato" ? "Triple felina" : "Otras vacunas";
// "martina@gmail.com" → "ma******@gmail.com"
const enmascararEmail = e => { const [u, d] = e.split("@"); return u.slice(0, 2) + "*".repeat(Math.max(3, u.length - 2)) + "@" + d; };
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
// Reglas de contraseña (las mismas que valida el servidor en validar_pass())
const REGLAS_PASS = [
  { t: "Al menos 8 caracteres", falta: "al menos 8 caracteres", ok: p => [...p].length >= 8 },
  { t: "Una mayúscula", falta: "una mayúscula", ok: p => /\p{Lu}/u.test(p) },
  { t: "Una minúscula", falta: "una minúscula", ok: p => /\p{Ll}/u.test(p) },
  { t: "Un número", falta: "un número", ok: p => /\d/.test(p) },
  { t: "Un carácter especial (! ? # $ % & * .)", falta: "un carácter especial (como ! ? # $ % & * .)", ok: p => /[^\p{L}\p{N}\s]/u.test(p) },
];
const PASS_COMUNES = ["password", "contraseña", "contrasena", "qwerty", "12345678", "abc123", "guardiavet"];
function passError(p, email = "") {
  if ([...p].length < 8) return "Tiene que tener al menos 8 caracteres.";
  if (new TextEncoder().encode(p).length > 72) return "Es demasiado larga: puede tener hasta 72 caracteres.";
  const falta = REGLAS_PASS.filter(r => !r.ok(p)).map(r => r.falta);
  if (falta.length) { const ult = falta.pop(); return "Le falta " + (falta.length ? falta.join(", ") + " y " : "") + ult + "."; }
  if (/^\s|\s$/.test(p)) return "No puede empezar ni terminar con un espacio.";
  const minus = p.toLowerCase();
  const comun = PASS_COMUNES.find(c => minus.includes(c));
  if (comun) return "Es muy fácil de adivinar: no uses \"" + comun + "\".";
  const usuario = (email || "").toLowerCase().split("@")[0];
  if (usuario.length >= 4 && minus.includes(usuario)) return "No puede contener tu email.";
  return "";
}
