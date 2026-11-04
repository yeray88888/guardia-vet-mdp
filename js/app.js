/* ============================================================
   Guardia Vet MDP · app.js
   Aplicación en React (con JSX). Babel la traduce en el navegador.

   Se conecta con el servidor PHP de la carpeta "api". Si no lo encuentra
   (por ejemplo, si se abre sin XAMPP), funciona en "modo demostración"
   con datos en memoria que se pierden al recargar.

   APIs que usa:
   - API propia en PHP (JSON): usuarios, mascotas, veterinarias, horarios.
   - Leaflet + OpenStreetMap: el mapa de veterinarias.
   - Nominatim (OpenStreetMap): convierte la dirección de una veterinaria en
     coordenadas cuando se registra (geocodificación).
   - Geolocalización del navegador: "Usar mi ubicación" para ordenar por distancia.
   ============================================================ */

const { useState, useEffect, useRef } = React;
const API_URL = "api";

/* ---------- datos fijos ---------- */
const URGENCIAS = ["Intoxicación", "Golpe o fractura", "Dificultad para respirar", "Parto", "Herida o sangrado", "Vómitos o diarrea"];
const SERVICIOS = ["Control general", "Vacunación", "Desparasitación", "Castración", "Peluquería", "Análisis y estudios", "Atención a domicilio", "Cirugía"];
const ESPECIES = ["Perro", "Gato", "Conejo", "Ave", "Otro"];
const BARRIOS = ["Centro", "La Perla", "Güemes", "Los Pinares", "Puerto", "Constitución", "San Juan", "Los Troncos", "Chauvín", "Playa Grande", "Villa Lourdes", "Las Avenidas", "Peralta Ramos Oeste", "Juramento", "Punta Mogotes", "Otro"];
const RAZAS = {
  Perro: ["Mestizo", "Labrador", "Golden Retriever", "Ovejero Alemán", "Caniche", "Bulldog Francés", "Beagle", "Pitbull", "Dogo Argentino", "Border Collie", "Schnauzer"],
  Gato: ["Mestizo", "Siamés", "Persa", "Maine Coon", "Angora", "Bengalí"],
  Conejo: ["Enano", "Belier", "Cabeza de león"], Ave: ["Canario", "Cotorra", "Loro", "Cacatúa"], Otro: []
};
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MOTIVOS = ["Feriado", "Vacaciones", "Capacitación", "Problema técnico", "Cerrado por hoy"];
const uid = p => p + Math.random().toString(36).slice(2, 8);
const copia = x => JSON.parse(JSON.stringify(x));

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
const AVISO_CALLES = "Las calles del mapa no cargaron. Se ven al abrir la página con internet.";

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

/* ---------- datos de ejemplo (solo modo demostración; el PHP los carga con instalar.php) ---------- */
const MASCOTA_VACIA = {
  nombre: "", especie: "Perro", raza: "", sexo: "Macho", nacimiento: "", peso: "", castrado: false, color: "",
  alergias: [], condiciones: "", medicacion: "", antirrabica: "", vacunaGeneral: "", chip: "", donante: false, notas: ""
};
// Ubicaciones y nombres de ejemplo (inventados)
const VETS_BASE = [
  { id: 1, nombre: "Clínica Veterinaria Güemes", barrio: "Los Pinares", direccion: "Güemes 2850", tel: "223 555-0101", espera: 15, lat: -38.0180, lng: -57.5520,
    c: { semana: [[9, 13], [16, 20]], finde: [[10, 13]] }, g: { semana: [[8, 24]], finde: [[9, 21]] }, puede: ["Intoxicación", "Herida o sangrado", "Vómitos o diarrea"], servicios: ["Control general", "Vacunación", "Desparasitación", "Peluquería"] },
  { id: 2, nombre: "Veterinaria del Puerto", barrio: "Puerto", direccion: "12 de Octubre 3200", tel: "223 555-0102", espera: 10, lat: -38.0410, lng: -57.5460,
    c: { semana: [[9, 18]], finde: [] }, g: { semana: [[9, 21]], finde: [] }, puede: ["Herida o sangrado", "Vómitos o diarrea"], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 3, nombre: "Hospital Veterinario Constitución 24 h", barrio: "Constitución", direccion: "Av. Constitución 5100", tel: "223 555-0103", espera: 25, lat: -37.9775, lng: -57.5650,
    c: { semana: [[8, 20]], finde: [[9, 13]] }, g: { semana: [[0, 24]], finde: [[0, 24]] }, puede: URGENCIAS, servicios: SERVICIOS },
  { id: 4, nombre: "Centro Veterinario La Perla", barrio: "La Perla", direccion: "San Luis 1500", tel: "223 555-0104", espera: 20, lat: -37.9925, lng: -57.5505,
    c: { semana: [[9, 19]], finde: [[10, 14]] }, g: { semana: [[8, 22]], finde: [[10, 22]] }, puede: ["Intoxicación", "Golpe o fractura", "Vómitos o diarrea"], servicios: ["Control general", "Vacunación", "Castración"] },
  { id: 5, nombre: "Guardia Veterinaria San Juan", barrio: "San Juan", direccion: "San Juan 2700", tel: "223 555-0105", espera: 30, lat: -37.9985, lng: -57.5680,
    c: { semana: [], finde: [] }, g: { semana: [[0, 8], [20, 24]], finde: [[0, 24]] }, puede: ["Intoxicación", "Golpe o fractura", "Dificultad para respirar", "Parto"], servicios: [] },
  { id: 6, nombre: "Veterinaria Los Troncos", barrio: "Los Troncos", direccion: "Rodríguez Peña 4100", tel: "223 555-0106", espera: 5, lat: -38.0230, lng: -57.5470,
    c: { semana: [[9, 20]], finde: [[9, 13]] }, g: { semana: [[9, 20]], finde: [[9, 13]] }, puede: ["Vómitos o diarrea", "Herida o sangrado"], servicios: ["Control general", "Vacunación", "Peluquería"] },
  { id: 7, nombre: "Veterinaria Plaza Mitre", barrio: "Centro", direccion: "San Luis 2200", tel: "223 555-0107", espera: 0, lat: -38.0000, lng: -57.5560,
    c: { semana: [[9, 13], [16, 20]], finde: [[10, 13]] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación", "Peluquería"] },
  { id: 8, nombre: "Consultorio Veterinario Chauvín", barrio: "Chauvín", direccion: "Alberti 3400", tel: "223 555-0108", espera: 0, lat: -38.0120, lng: -57.5630,
    c: { semana: [[10, 19]], finde: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Castración"] },
  // Veterinarias reales de Mar del Plata (datos de Google Maps)
  { id: 9, nombre: "Layús Clínica Veterinaria Integral", barrio: "La Perla", direccion: "3 de Febrero 2765", tel: "0223 577-3834", espera: 20,
    lat: -37.995217, lng: -57.545974,
    c: { semana: [[0, 24]], finde: [[0, 24]] }, g: { semana: [[0, 24]], finde: [[0, 24]] }, puede: URGENCIAS, servicios: ["Control general", "Vacunación"] },
  { id: 10, nombre: "Citopatología Veterinaria", barrio: "Centro", direccion: "14 de Julio 1881", tel: "Instagram @cito.patologia.veterinaria", espera: 0,
    lat: -37.995218, lng: -57.559147,
    c: { semana: [[9, 13], [16, 19]], finde: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Análisis y estudios"] },
  { id: 11, nombre: "Veterinaria La Rinconada", barrio: "Centro", direccion: "Dorrego 1338", tel: "Sin teléfono cargado", espera: 0,
    lat: -37.990393, lng: -57.556618,
    c: { semana: [[9, 13], [16, 20]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 12, nombre: "Veterinaria Consultorio en Acantilados", barrio: "Puerto", direccion: "Gaboto 5916", tel: "0223 502-7878", espera: 0,
    lat: -38.024277, lng: -57.567859,
    c: { semana: [[9, 19]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Atención a domicilio"] },
  { id: 13, nombre: "Cirugía Veterinaria Marcelo Tachauer", barrio: "Los Troncos", direccion: "Corrientes 3831", tel: "0223 524-1066", espera: 0,
    lat: -38.017928, lng: -57.55777,
    c: { semana: [[9, 19]], finde: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Cirugía", "Castración", "Control general"] },
  { id: 14, nombre: "La Cucha del Puerto", barrio: "Puerto", direccion: "Av. Edison 415", tel: "0223 480-7979", espera: 0,
    lat: -38.041615, lng: -57.548541,
    c: { semana: [[9, 18]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 15, nombre: "Veterinaria Lobos", barrio: "Puerto", direccion: "12 de Octubre 4358", tel: "0223 655-5902", espera: 0,
    lat: -38.036015, lng: -57.55572,
    c: { semana: [[9, 15]], finde: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 16, nombre: "Veterinaria Del Sur", barrio: "Villa Lourdes", direccion: "Juan B. Justo 865", tel: "0223 489-3126", espera: 0,
    lat: -38.034355, lng: -57.550626,
    c: { semana: [[9, 15], [16, 20]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 17, nombre: "Argos Veterinaria", barrio: "Puerto", direccion: "Av. Juan B. Justo 362", tel: "0223 529-3333", espera: 0,
    lat: -38.037869, lng: -57.546403,
    c: { semana: [[9, 17]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Peluquería"] },
  { id: 18, nombre: "Clínica Veterinaria (Cerrito 17)", barrio: "Las Avenidas", direccion: "Cerrito 17", tel: "Sin teléfono cargado", espera: 0,
    lat: -38.031293, lng: -57.555786,
    c: { semana: [[9, 13], [17, 20]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 19, nombre: "Veterinaria Dr. Paz", barrio: "Los Troncos", direccion: "Tucumán 4170", tel: "0223 538-4870", espera: 0,
    lat: -38.022165, lng: -57.556815,
    c: { semana: [[9, 18]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 20, nombre: "Centro Médico Veterinario Dr Ariel Perez", barrio: "Peralta Ramos Oeste", direccion: "Talcahuano 46", tel: "0223 481-9560", espera: 0,
    lat: -38.022571, lng: -57.566085,
    c: { semana: [[9, 16]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 21, nombre: "A.A.P Veterinaria", barrio: "Juramento", direccion: "Av. Fortunato de la Plaza 5829", tel: "0223 482-1036", espera: 0,
    lat: -38.036566, lng: -57.581191,
    c: { semana: [[9, 13], [16, 20]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 22, nombre: "Veterinaria Del Bosque", barrio: "Punta Mogotes", direccion: "Av. Mario Bravo 2289", tel: "0223 484-0516", espera: 0,
    lat: -38.068212, lng: -57.560601,
    c: { semana: [[9, 13], [16, 20]], finde: [[9, 13]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Desparasitación"] },
  { id: 23, nombre: "Punto Mascotas Veterinaria", barrio: "Centro", direccion: "Corrientes 2999", tel: "0223 494-6161", espera: 0,
    lat: -38.010754, lng: -57.552383,
    c: { semana: [[9, 19]], finde: [[9, 17]], domingo: [] }, g: { semana: [], finde: [] }, puede: [], servicios: ["Control general", "Vacunación", "Peluquería"] },
];
function vetsDeEjemplo() {
  const vets = VETS_BASE.map(({ c, g, ...v }) => ({ ...copia(v), abierta: true, verificada: true, horario: armarHorario(c, g), excepciones: [] }));
  vets[6].excepciones.push({ id: 901, fecha: fechaISO(sumarDias(1)), aplica: "ambos", cerrado: true, abre: null, cierra: null, motivo: "Capacitación del equipo" });
  vets[2].excepciones.push({ id: 902, fecha: fechaISO(sumarDias(3)), aplica: "consulta", cerrado: false, abre: 9, cierra: 13, motivo: "Jornada de vacunación" });
  return vets;
}
const USUARIOS_DEMO = [
  { id: "u1", rol: "dueno", nombre: "Martina López", email: "dueno@ejemplo.com", pass: "Demo1234!", tel: "223 555-0201", barrio: "La Perla",
    mascotas: [
      { ...MASCOTA_VACIA, id: "m1", nombre: "Toby", especie: "Perro", raza: "Labrador", sexo: "Macho", nacimiento: "2021-03", peso: "30", castrado: true,
        color: "Negro, mancha blanca en el pecho", alergias: ["Penicilina", "Pollo"], antirrabica: "2026-04", vacunaGeneral: "2026-04",
        chip: "985112000654321", donante: true, notas: "Se pone nervioso con otros perros en la sala de espera." },
      { ...MASCOTA_VACIA, id: "m2", nombre: "Mora", especie: "Gato", raza: "Siamés", sexo: "Hembra", nacimiento: "2024-08", peso: "3.8", castrado: true,
        color: "Crema con orejas oscuras", condiciones: "Asma felina", medicacion: "Inhalador de salbutamol cuando tiene crisis",
        antirrabica: "2025-09", vacunaGeneral: "2025-09" },
      { ...MASCOTA_VACIA, id: "m3", nombre: "Pipo", especie: "Ave", raza: "Canario", sexo: "Macho", nacimiento: "2025-01", peso: "0.02" }
    ] },
  { id: "u2", rol: "vet", nombre: "Dra. Laura Gómez", email: "vet@ejemplo.com", pass: "Demo1234!", tel: "223 555-0103", barrio: "Constitución", matricula: "MV 4521", vetId: 3 },
  { id: "u3", rol: "dueno", nombre: "Diego Ferreyra", email: "diego@ejemplo.com", pass: "Demo1234!", tel: "223 555-0202", barrio: "Constitución",
    mascotas: [{ ...MASCOTA_VACIA, id: "m4", nombre: "Thor", especie: "Perro", raza: "Ovejero Alemán", nacimiento: "2020-06", peso: "34", donante: true }] },
  { id: "u4", rol: "dueno", nombre: "Sofía Ruiz", email: "sofia@ejemplo.com", pass: "Demo1234!", tel: "223 555-0203", barrio: "Centro",
    mascotas: [{ ...MASCOTA_VACIA, id: "m5", nombre: "Simón", especie: "Gato", raza: "Maine Coon", nacimiento: "2022-02", peso: "6.5", donante: true }] },
];

/* ---------- conexión con el servidor PHP ---------- */
async function pedir(ruta, metodo = "GET", datos) {
  const r = await fetch(API_URL + "/" + ruta, {
    method: metodo, credentials: "same-origin",
    headers: { "X-GuardiaVet": "1", ...(datos !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: datos !== undefined ? JSON.stringify(datos) : undefined
  });
  let j = null; try { j = await r.json(); } catch (e) { }
  if (!r.ok || !j) {
    const err = new Error((j && j.error) || "No se pudo conectar con el servidor.");
    err.campos = j && j.campos; throw err;
  }
  return j;
}
const backendPHP = {
  modo: "php",
  sesion: async () => { const j = await pedir("sesion.php"); if (!("usuario" in j)) throw new Error("Sin servidor"); return j.usuario; },
  login: (email, pass) => pedir("login.php", "POST", { email, pass }).then(j => j.usuario),
  registro: datos => pedir("registro.php", "POST", datos).then(j => j.usuario),
  salir: () => pedir("logout.php", "POST", {}),
  vets: () => pedir("veterinarias.php").then(j => j.veterinarias),
  guardarMascota: m => (m.id ? pedir("mascotas.php?id=" + encodeURIComponent(m.id), "PUT", m) : pedir("mascotas.php", "POST", m)).then(j => j.mascota),
  borrarMascota: id => pedir("mascotas.php?id=" + encodeURIComponent(id), "DELETE"),
  miVet: () => pedir("horarios.php").then(j => j.veterinaria),
  guardarHorario: horario => pedir("horarios.php", "PUT", { horario }).then(j => j.veterinaria),
  estadoGuardia: cambios => pedir("horarios.php", "PATCH", cambios).then(j => j.veterinaria),
  guardarUbicacion: p => pedir("horarios.php", "PATCH", { lat: p.lat, lng: p.lng }).then(j => j.veterinaria),
  agregarDiaEspecial: e => pedir("horarios.php", "POST", e).then(j => j.veterinaria),
  quitarDiaEspecial: id => pedir("horarios.php?id=" + id, "DELETE").then(j => j.veterinaria),
  donantes: especie => pedir("donantes.php?especie=" + encodeURIComponent(especie)).then(j => j.donantes),
  // Recuperación de cuenta
  recuperar: email => pedir("recuperar.php", "POST", { email }).then(j => ({ mensaje: j.mensaje, enlaceDemo: j.enlace_demo || null })),
  verificarEnlace: token => pedir("restablecer.php", "POST", { token, solo_verificar: true }).then(j => j.email),
  restablecer: (token, pass) => pedir("restablecer.php", "POST", { token, pass }).then(j => j.mensaje),
  olvideEmail: tel => pedir("olvide_email.php", "POST", { tel }).then(j => j.emails),
  cambiarPass: (actual, nueva) => pedir("cambiar_pass.php", "POST", { actual, nueva }).then(j => j.mensaje),
  ingresos: () => pedir("ingresos.php").then(j => j.ingresos),
};

// Modo demostración: imita al servidor con datos en memoria
function crearBackendDemo() {
  const db = { usuarios: copia(USUARIOS_DEMO), vets: vetsDeEjemplo(), sesion: null, enlaces: {}, ingresos: [] };
  const anotarIngreso = uid => db.ingresos.unshift({ uid, fecha: new Date().toISOString().slice(0, 19).replace("T", " "), ip: "esta computadora", dispositivo: "Este navegador" });
  const ok = x => Promise.resolve(copia(x));
  const falla = (msg, campos) => { const e = new Error(msg); e.campos = campos; return Promise.reject(e); };
  const yo = () => db.usuarios.find(u => u.id === db.sesion);
  const publico = u => { const { pass, ...resto } = u; return resto; };
  const miVet = () => db.vets.find(v => v.id === yo().vetId);
  return {
    modo: "demo",
    sesion: () => ok(db.sesion ? publico(yo()) : null),
    login: (email, pass) => {
      const u = db.usuarios.find(x => x.email === email.trim().toLowerCase());
      if (!u || u.pass !== pass) return falla("El email o la contraseña no coinciden. Revisalos y probá de nuevo.");
      db.sesion = u.id; anotarIngreso(u.id); return ok(publico(u));
    },
    registro: d => {
      if (db.usuarios.some(u => u.email === d.email)) return falla("Ya hay una cuenta con ese email.", { email: "Ya hay una cuenta con ese email. Ingresá desde \"Ya tengo cuenta\"." });
      const base = { id: uid("u"), rol: d.rol, nombre: d.nombre, email: d.email, pass: d.pass, tel: d.tel, barrio: d.barrio };
      if (d.rol === "dueno") { db.usuarios.push({ ...base, mascotas: [] }); }
      else {
        const vet = { id: Date.now(), nombre: d.clinica, barrio: d.barrio, direccion: d.direccion, tel: d.tel, espera: 15, abierta: true, verificada: true,
          lat: d.lat, lng: d.lng, puede: d.urgencias, servicios: d.servicios, horario: copia(d.horario), excepciones: [] };
        db.vets.push(vet);
        db.usuarios.push({ ...base, matricula: d.matricula.toUpperCase().replace(/^MV\s?/, "MV "), vetId: vet.id });
      }
      db.sesion = base.id; anotarIngreso(base.id); return ok(publico(yo()));
    },
    salir: () => { db.sesion = null; return ok({}); },
    vets: () => ok(db.vets.filter(v => v.verificada)),
    guardarMascota: m => {
      const u = yo();
      if (m.id) { u.mascotas = u.mascotas.map(x => x.id === m.id ? copia(m) : x); return ok(m); }
      const nueva = { ...copia(m), id: uid("m") }; u.mascotas.push(nueva); return ok(nueva);
    },
    borrarMascota: id => { const u = yo(); u.mascotas = u.mascotas.filter(x => x.id !== id); return ok({}); },
    miVet: () => ok(miVet()),
    guardarHorario: h => { miVet().horario = copia(h); return ok(miVet()); },
    estadoGuardia: c => { Object.assign(miVet(), c); return ok(miVet()); },
    guardarUbicacion: p => { Object.assign(miVet(), { lat: p.lat, lng: p.lng }); return ok(miVet()); },
    agregarDiaEspecial: e => {
      const v = miVet();
      v.excepciones = v.excepciones.filter(x => !(x.fecha === e.fecha && (x.aplica === "ambos" || e.aplica === "ambos" || x.aplica === e.aplica)));
      v.excepciones.push({ ...e, id: Date.now() }); v.excepciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
      return ok(v);
    },
    quitarDiaEspecial: id => { const v = miVet(); v.excepciones = v.excepciones.filter(x => x.id !== id); return ok(v); },
    donantes: especie => ok(db.usuarios.filter(u => u.rol === "dueno").flatMap(u => u.mascotas.filter(m => m.donante && m.especie === especie).map(m => ({ ...m, barrio: u.barrio })))),
    recuperar: email => {
      const u = db.usuarios.find(x => x.email === email.trim().toLowerCase());
      const r = { mensaje: "Si ese email tiene una cuenta, te mandamos un enlace para crear una contraseña nueva. Revisá también la carpeta de spam.", enlaceDemo: null };
      if (u) {
        const token = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
        db.enlaces[token] = { uid: u.id, vence: Date.now() + 3600000, usado: false };
        r.enlaceDemo = "?recuperar=" + token;
      }
      return ok(r);
    },
    verificarEnlace: token => {
      const e = db.enlaces[token];
      if (!e || e.usado || e.vence < Date.now()) return falla("El enlace venció o ya se usó. Pedí uno nuevo desde \"¿Olvidaste tu contraseña?\".");
      return ok(enmascararEmail(db.usuarios.find(u => u.id === e.uid).email));
    },
    restablecer: (token, pass) => {
      const e = db.enlaces[token];
      if (!e || e.usado || e.vence < Date.now()) return falla("El enlace venció o ya se usó. Pedí uno nuevo desde \"¿Olvidaste tu contraseña?\".");
      const pe = passError(pass); if (pe) return falla("Revisá la contraseña.", { pass: pe });
      db.usuarios.find(u => u.id === e.uid).pass = pass; e.usado = true;
      return ok("Listo, ya podés ingresar con tu contraseña nueva.");
    },
    olvideEmail: tel => {
      const fin = tel.replace(/\D/g, "").slice(-8);
      if (fin.length < 8) return falla("Escribí el teléfono con característica.", { tel: "Escribí el teléfono con característica, por ejemplo 223 555 1234." });
      return ok(db.usuarios.filter(u => (u.tel || "").replace(/\D/g, "").endsWith(fin)).map(u => enmascararEmail(u.email)));
    },
    cambiarPass: (actual, nueva) => {
      const u = yo();
      if (u.pass !== actual) return falla("Revisá los datos marcados.", { actual: "La contraseña actual no es correcta." });
      const pe = passError(nueva); if (pe) return falla("Revisá los datos marcados.", { nueva: pe });
      if (nueva === actual) return falla("Revisá los datos marcados.", { nueva: "Tiene que ser distinta de la contraseña actual." });
      u.pass = nueva; return ok("Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.");
    },
    ingresos: () => ok(db.ingresos.filter(i => i.uid === db.sesion).slice(0, 5)),
  };
}

/* ---------- piezas comunes ---------- */
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

/* ---------- mapas (Leaflet) ---------- */
// Mapa de veterinarias con un marcador numerado por cada una
function MapaVets({ vets, origen, sel, onSel }) {
  const caja = useRef(null), mapa = useRef(null), capa = useRef(null), ajustado = useRef(false);
  const [sinCalles, setSinCalles] = useState(false);
  const elegir = useRef(onSel); elegir.current = onSel;
  useEffect(() => {
    if (!hayMapa()) return;
    const m = L.map(caja.current, { scrollWheelZoom: false }).setView([origen.lat, origen.lng], 13);
    agregarCalles(m, () => setSinCalles(true));
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    setTimeout(() => m.invalidateSize(), 150);
    return () => { m.remove(); mapa.current = null; };
  }, []);
  const clave = vets.map(v => v.id + ":" + v.n + ":" + v.ab + ":" + v.atiende).join("|") + "|" + sel + "|" + origen.lat + "," + origen.lng;
  useEffect(() => {
    const m = mapa.current; if (!m) return;
    capa.current.clearLayers();
    L.circleMarker([origen.lat, origen.lng], { radius: 8, color: "#ffffff", weight: 2, fillColor: "#e0a100", fillOpacity: 1 })
      .bindTooltip(origen.real ? "Vos" : "Centro de Mar del Plata").addTo(capa.current);
    vets.forEach(v => {
      L.marker([v.lat, v.lng], { icon: iconoPin(v.n, (v.ab && v.atiende ? "abierta" : "cerrada") + (sel === v.id ? " sel" : "")), title: v.nombre, zIndexOffset: sel === v.id ? 1000 : 0 })
        .on("click", () => elegir.current(v.id)).addTo(capa.current);
    });
    if (!ajustado.current && vets.length) {
      m.fitBounds(L.latLngBounds([...vets.map(v => [v.lat, v.lng]), [origen.lat, origen.lng]]), { padding: [30, 30] });
      ajustado.current = true;
    }
  }, [clave]);
  useEffect(() => { ajustado.current = false; }, [origen.lat, origen.lng]);
  useEffect(() => {
    const v = vets.find(x => x.id === sel);
    if (v && mapa.current) mapa.current.panTo([v.lat, v.lng]);
  }, [sel]);
  if (!hayMapa()) return <div className="empty">No se pudo cargar el mapa. Revisá la conexión a internet.</div>;
  return <div className="card mapbox">
    <div className="mapawrap">
      <div ref={caja} className="mapa" aria-label="Mapa de veterinarias de Mar del Plata"></div>
      {sinCalles && <div className="sincalles">{AVISO_CALLES}</div>}
    </div>
    <span className="note">Tocá un marcador para ver la veterinaria. Verde: abierta · Gris: cerrada.</span>
  </div>;
}

// Mapa chico con un marcador que se puede arrastrar (para marcar dónde está la veterinaria)
function ElegirUbicacion({ valor, foco, onChange }) {
  const caja = useRef(null), mapa = useRef(null), marca = useRef(null);
  const [sinCalles, setSinCalles] = useState(false);
  const cambiar = useRef(onChange); cambiar.current = onChange;
  useEffect(() => {
    if (!hayMapa()) return;
    const p = valor || CENTRO_MDP;
    const m = L.map(caja.current).setView([p.lat, p.lng], valor ? 16 : 13);
    agregarCalles(m, () => setSinCalles(true));
    const mk = L.marker([p.lat, p.lng], { draggable: true, icon: iconoPin("+", "abierta"), title: "Arrastrá hasta la veterinaria" }).addTo(m);
    mk.on("dragend", () => { const q = mk.getLatLng(); cambiar.current({ lat: q.lat, lng: q.lng }); });
    m.on("click", e => { mk.setLatLng(e.latlng); cambiar.current({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    mapa.current = m; marca.current = mk;
    setTimeout(() => m.invalidateSize(), 150);
    return () => m.remove();
  }, []);
  useEffect(() => {
    if (foco && marca.current) { marca.current.setLatLng([foco.lat, foco.lng]); mapa.current.setView([foco.lat, foco.lng], 16); }
  }, [foco]);
  if (!hayMapa()) return <div className="empty">No se pudo cargar el mapa. Revisá la conexión a internet.</div>;
  return <div className="mapawrap">
    <div ref={caja} className="mapa chico" aria-label="Mapa para marcar la ubicación"></div>
    {sinCalles && <div className="sincalles">{AVISO_CALLES}</div>}
  </div>;
}

/* ---------- ficha de la mascota ---------- */
function Alergias({ m }) {
  return m.alergias.length > 0
    ? <div className="allergy">Alérgico/a a: {m.alergias.join(", ")}</div>
    : <div className="allergy none">Sin alergias conocidas</div>;
}
function Ficha({ m, compacta }) {
  const ar = vacunaEstado(m.antirrabica), vg = vacunaEstado(m.vacunaGeneral);
  return <article className="card">
    <div className="row" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
      <div className={claseAvatar(m)}>{inicial(m)}</div>
      <div style={{ minWidth: 0 }}><h3>{m.nombre}</h3><div className="note">{m.especie} · {m.raza || "Raza sin cargar"}</div></div>
    </div>
    <div className="facts">
      <span><b>{edadTexto(m.nacimiento)}</b></span><span>{m.sexo}</span>
      {m.peso && <span><b>{m.peso} kg</b></span>}
      <span>{m.castrado ? (m.sexo === "Hembra" ? "Castrada" : "Castrado") : "Sin castrar"}</span>
    </div>
    <Alergias m={m} />
    <dl className="kv">
      {m.condiciones && <><dt>Condiciones</dt><dd>{m.condiciones}</dd></>}
      {m.medicacion && <><dt>Medicación</dt><dd>{m.medicacion}</dd></>}
      {!compacta && <>
        <dt>Antirrábica</dt><dd>{mesTexto(m.antirrabica)} <span className={"pill " + ar.c}>{ar.t}</span></dd>
        <dt>{nombreVacuna(m.especie)}</dt><dd>{mesTexto(m.vacunaGeneral)} <span className={"pill " + vg.c}>{vg.t}</span></dd>
        {m.color && <><dt>Señas</dt><dd>{m.color}</dd></>}
        <dt>Microchip</dt><dd>{m.chip || "No tiene"}</dd>
        {(m.especie === "Perro" || m.especie === "Gato") && <><dt>Donante</dt><dd>{m.donante ? "Sí, puede donar sangre" : "No"}</dd></>}
      </>}
      {m.notas && <><dt>Notas</dt><dd>{m.notas}</dd></>}
    </dl>
  </article>;
}

function FormMascota({ inicialM, onGuardar, onCancelar, onBorrar }) {
  const [f, setF] = useState(inicialM || MASCOTA_VACIA);
  const [nuevaAl, setNuevaAl] = useState("");
  const [err, setErr] = useState({});
  const [errGeneral, setErrGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const puedeDonar = f.especie === "Perro" || f.especie === "Gato";
  const agregarAlergia = () => {
    const a = nuevaAl.trim();
    if (a && !f.alergias.some(x => x.toLowerCase() === a.toLowerCase())) setF({ ...f, alergias: [...f.alergias, a] });
    setNuevaAl("");
  };
  const guardar = async e => {
    e.preventDefault();
    const er = {};
    if (!f.nombre.trim()) er.nombre = "Escribí el nombre.";
    if (!f.raza.trim()) er.raza = "Escribí la raza. Si no sabés, poné Mestizo.";
    const meses = mesesDesde(f.nacimiento);
    if (meses === null) er.nacimiento = "Elegí el mes y año en que nació (puede ser aproximado).";
    else if (meses < 0) er.nacimiento = "La fecha no puede ser futura.";
    if (f.peso && (+f.peso <= 0 || +f.peso > 120)) er.peso = "Revisá el peso: tiene que estar entre 0 y 120 kg.";
    if (f.chip && !/^\d{15}$/.test(f.chip)) er.chip = "El microchip tiene 15 números.";
    setErr(er); setErrGeneral("");
    if (Object.keys(er).length) return;
    setGuardando(true);
    try { await onGuardar({ ...f, nombre: f.nombre.trim(), raza: f.raza.trim(), donante: puedeDonar && f.donante }); }
    catch (x) { setErr(x.campos || {}); setErrGeneral(x.message); setGuardando(false); }
  };
  return <>
    <button className="back" onClick={onCancelar}>← Volver</button>
    <h2>{inicialM ? "Editar a " + inicialM.nombre : "Nueva mascota"}</h2>
    <form className="form" onSubmit={guardar} noValidate>
      <fieldset><legend>Datos básicos</legend>
        <Campo label="Nombre" error={err.nombre}><input id="m-nombre" value={f.nombre} onChange={set("nombre")} autoComplete="off" /></Campo>
        <div className="grid2">
          <Campo label="Especie"><select id="m-especie" value={f.especie} onChange={set("especie")}>{ESPECIES.map(x => <option key={x}>{x}</option>)}</select></Campo>
          <Campo label="Sexo"><select id="m-sexo" value={f.sexo} onChange={set("sexo")}><option>Macho</option><option>Hembra</option></select></Campo>
        </div>
        <Campo label="Raza" error={err.raza}>
          <input id="m-raza" list={"razas-" + f.especie} value={f.raza} onChange={set("raza")} placeholder="Ej.: Mestizo" autoComplete="off" />
          <datalist id={"razas-" + f.especie}>{(RAZAS[f.especie] || []).map(r => <option key={r} value={r} />)}</datalist>
        </Campo>
        <div className="grid2">
          <Campo label="Nació (mes y año)" error={err.nacimiento}><input id="m-nac" type="month" value={f.nacimiento} onChange={set("nacimiento")} /></Campo>
          <Campo label="Peso (kg)" error={err.peso}><input id="m-peso" type="number" inputMode="decimal" min="0" step="0.1" value={f.peso} onChange={set("peso")} /></Campo>
        </div>
        {f.nacimiento && !err.nacimiento && <span className="note">Edad: {edadTexto(f.nacimiento)}</span>}
        <label className="chk"><input id="m-castrado" type="checkbox" checked={f.castrado} onChange={set("castrado")} />Está {f.sexo === "Hembra" ? "castrada" : "castrado"}</label>
      </fieldset>

      <fieldset><legend>Salud</legend>
        <div className="field">Alergias (medicamentos, alimentos, otros)
          {f.alergias.length > 0
            ? <div className="alchips">{f.alergias.map(a => <span className="alchip" key={a}>{a}
                <button type="button" aria-label={"Quitar " + a} onClick={() => setF({ ...f, alergias: f.alergias.filter(x => x !== a) })}>×</button></span>)}</div>
            : <span className="note">Sin alergias cargadas.</span>}
          <div style={{ display: "flex", gap: "8px" }}>
            <input id="m-alergia" value={nuevaAl} onChange={e => setNuevaAl(e.target.value)} placeholder="Ej.: Penicilina"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarAlergia(); } }} style={{ flex: 1 }} autoComplete="off" />
            <button type="button" className="btn ghost" onClick={agregarAlergia}>Agregar</button>
          </div>
        </div>
        <Campo label="Enfermedades o condiciones"><input id="m-cond" value={f.condiciones} onChange={set("condiciones")} placeholder="Ej.: diabetes, epilepsia, cardiopatía" /></Campo>
        <Campo label="Medicación actual"><input id="m-med" value={f.medicacion} onChange={set("medicacion")} placeholder="Nombre y dosis" /></Campo>
      </fieldset>

      <fieldset><legend>Vacunas (última aplicación)</legend>
        <div className="grid2">
          <Campo label="Antirrábica"><input id="m-antirr" type="month" value={f.antirrabica} onChange={set("antirrabica")} /></Campo>
          <Campo label={nombreVacuna(f.especie)}><input id="m-vgen" type="month" value={f.vacunaGeneral} onChange={set("vacunaGeneral")} /></Campo>
        </div>
        <span className="note">La app avisa cuando pasa más de un año desde la última dosis.</span>
      </fieldset>

      <fieldset><legend>Identificación</legend>
        <Campo label="Color y señas particulares"><input id="m-color" value={f.color} onChange={set("color")} placeholder="Ayuda a reconocerlo si se pierde" /></Campo>
        <Campo label="Número de microchip (opcional)" error={err.chip}><input id="m-chip" inputMode="numeric" value={f.chip} onChange={set("chip")} placeholder="15 números" /></Campo>
        <Campo label="Notas para el veterinario"><textarea id="m-notas" rows="2" value={f.notas} onChange={set("notas")} placeholder="Ej.: muerde cuando tiene miedo"></textarea></Campo>
      </fieldset>

      {puedeDonar && <fieldset><legend>Donación de sangre</legend>
        <label className="chk"><input id="m-donante" type="checkbox" checked={f.donante} onChange={set("donante")} />Puede ser donante si una veterinaria lo necesita</label>
        <span className="note">{f.especie === "Perro" ? "Perros: más de 25 kg, entre 1 y 8 años y sanos." : "Gatos: más de 4 kg, entre 1 y 8 años y sanos."} La veterinaria confirma si puede donar.</span>
      </fieldset>}

      {errGeneral && <span className="errtxt">{errGeneral}</span>}
      <button type="submit" className="btn big" disabled={guardando}>{guardando ? "Guardando…" : inicialM ? "Guardar cambios" : "Agregar mascota"}</button>
      {onBorrar && (confirmar
        ? <div className="card"><b>¿Borrar la ficha de {inicialM.nombre}?</b><span className="note">No se puede deshacer.</span>
            <div className="row2"><button type="button" className="btn ghost" onClick={() => setConfirmar(false)}>Cancelar</button>
              <button type="button" className="btn urg" onClick={onBorrar}>Sí, borrar</button></div></div>
        : <button type="button" className="btn danger" onClick={() => setConfirmar(true)}>Borrar ficha</button>)}
    </form>
  </>;
}

function Mascotas({ mascotas, estado, setEstado, onGuardar, onBorrar }) {
  if (estado.modo === "nueva") return <FormMascota onGuardar={onGuardar} onCancelar={() => setEstado({ modo: "lista" })} />;
  const m = mascotas.find(x => x.id === estado.id);
  if (estado.modo === "editar" && m) return <FormMascota key={m.id} inicialM={m} onGuardar={x => onGuardar({ ...x, id: m.id })}
    onCancelar={() => setEstado({ modo: "ver", id: m.id })} onBorrar={() => onBorrar(m.id)} />;
  if (estado.modo === "ver" && m) return <>
    <button className="back" onClick={() => setEstado({ modo: "lista" })}>← Mis mascotas</button>
    <Ficha m={m} />
    <button className="btn" onClick={() => setEstado({ modo: "editar", id: m.id })}>Editar ficha</button>
  </>;
  return <>
    <div className="row"><h2>Mis mascotas</h2><span className="note">{mascotas.length} {mascotas.length === 1 ? "mascota" : "mascotas"}</span></div>
    <p className="note" style={{ margin: 0 }}>La ficha se envía sola a la veterinaria cuando avisás una urgencia o pedís turno.</p>
    {mascotas.length === 0
      ? <div className="empty">Todavía no cargaste ninguna mascota.</div>
      : <div className="list">{mascotas.map(x =>
          <button key={x.id} className="card pet" onClick={() => setEstado({ modo: "ver", id: x.id })}>
            <div className={claseAvatar(x)}>{inicial(x)}</div>
            <div className="info"><h3>{x.nombre}</h3><div className="note">{x.especie} · {x.raza} · {edadTexto(x.nacimiento)}</div>
              <div className="tags" style={{ marginTop: "6px" }}>
                {x.alergias.length > 0 && <span className="pill alert">Alergias</span>}
                {x.condiciones && <span className="pill warn">{x.condiciones}</span>}
                {vacunaEstado(x.antirrabica).c === "alert" && <span className="pill warn">Antirrábica vencida</span>}
                {x.donante && <span className="pill ok">Donante</span>}
              </div></div>
            <span aria-hidden="true" style={{ color: "var(--muted)" }}>›</span>
          </button>)}</div>}
    <button className="btn big" onClick={() => setEstado({ modo: "nueva" })}>+ Agregar mascota</button>
  </>;
}

/* ---------- buscar veterinaria ---------- */
function VetCard({ v, esUrg, filtro, ahora, sel, onAvisar, onTurno }) {
  const tipo = esUrg ? "guardia" : "consulta";
  const hoy = horarioDelDia(v, ahora.fecha, tipo);
  const proximo = (v.excepciones || []).find(e => e.fecha === fechaISO(sumarDias(1)) && (e.aplica === "ambos" || e.aplica === tipo));
  const apagada = esUrg ? !(v.ab && v.atiende) : !v.atiende;
  return <article className={"card" + (apagada ? " closed" : "") + (sel ? " sel" : "")}>
    <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
      <h3>{v.n}. {v.nombre}</h3>
      {!v.atiende ? <span className="pill warn">{esUrg ? "No atiende esto" : "No hace esto"}</span>
        : !v.ab ? <span className="pill no">Cerrada</span> : <span className="pill ok">Abierta</span>}
    </div>
    <div className="facts"><span>{v.direccion} · <b>{v.km} km</b></span>
      {esUrg && v.ab && <span>Espera <b>{v.espera} min</b></span>}<span>Tel. <b>{v.tel}</b></span></div>
    <div className="note">{esUrg ? "Guardia hoy: " : "Atención hoy: "}{hoy.texto}</div>
    {hoy.ex && <div className="aviso">{hoy.ex.cerrado ? "Hoy no atiende" : "Hoy tiene horario especial"}: {hoy.ex.motivo}</div>}
    {!hoy.ex && proximo && <div className="aviso">Mañana {proximo.cerrado ? "no atiende" : "atiende de " + hhmm(proximo.abre) + " a " + hhmm(proximo.cierra)}: {proximo.motivo}</div>}
    <div className="tags">{(esUrg ? v.puede : v.servicios).map(p => <span key={p} className={"tag" + (p === filtro ? " match" : "")}>{p}</span>)}</div>
    <div className="row2">
      <a className="btn ghost" href={linkComoLlegar(v)} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
      {esUrg
        ? <button className="btn urg" disabled={!(v.ab && v.atiende)} onClick={() => onAvisar(v)}>Voy en camino</button>
        : <button className="btn" disabled={!v.atiende} onClick={() => onTurno(v)}>Pedir turno</button>}
    </div>
  </article>;
}

function Buscar({ vets, ahora, origen, onUbicarme, onAvisar, onTurno }) {
  const [modo, setModo] = useState("urgencia");
  const [urg, setUrg] = useState("");
  const [serv, setServ] = useState("");
  const [verMapa, setVerMapa] = useState(true);
  const [sel, setSel] = useState(null);
  const esUrg = modo === "urgencia";
  const filtro = esUrg ? urg : serv;
  const esAbierta = v => esUrg ? abiertaAhora(v, ahora) : abiertaNormal(v, ahora);
  const lista = vets
    .filter(v => esUrg ? v.puede.length > 0 : v.servicios.length > 0)
    .map(v => ({ ...v, km: Math.round(distanciaKm(origen, v) * 10) / 10, ab: esAbierta(v), atiende: !filtro || (esUrg ? v.puede : v.servicios).includes(filtro) }))
    .sort((a, b) => (b.ab && b.atiende) - (a.ab && a.atiende) || a.km - b.km)
    .map((v, i) => ({ ...v, n: i + 1 }));
  const abiertas = lista.filter(v => v.ab && v.atiende).length;
  const elegida = lista.find(v => v.id === sel);
  const props = { esUrg, filtro, ahora, onAvisar: v => onAvisar(v, urg), onTurno: v => onTurno(v, serv) };
  return <>
    <div className="seg" role="group" aria-label="Tipo de atención">
      <button aria-pressed={esUrg} onClick={() => setModo("urgencia")}>Urgencia</button>
      <button aria-pressed={!esUrg} onClick={() => setModo("consulta")}>Consulta con turno</button>
    </div>
    <h2>{esUrg ? "¿Qué le pasa a tu mascota?" : "¿Qué necesitás?"}</h2>
    <div className="chips" role="group" aria-label={esUrg ? "Tipo de urgencia" : "Servicio"}>
      <button className={"chip" + (esUrg ? "" : " serv")} aria-pressed={filtro === ""} onClick={() => esUrg ? setUrg("") : setServ("")}>Todas</button>
      {(esUrg ? URGENCIAS : SERVICIOS).map(u => <button key={u} className={"chip" + (esUrg ? "" : " serv")} aria-pressed={filtro === u} onClick={() => esUrg ? setUrg(u) : setServ(u)}>{u}</button>)}
    </div>
    <div className="row">
      <span className="note">{esUrg
        ? (abiertas === 0 ? "Ninguna guardia abierta atiende esto ahora." : abiertas + (abiertas === 1 ? " veterinaria puede" : " veterinarias pueden") + " atenderte ahora")
        : abiertas + " abiertas ahora · podés pedir turno para mañana"}</span>
      <div className="seg small" role="group" aria-label="Vista">
        <button aria-pressed={verMapa} onClick={() => setVerMapa(true)}>Mapa</button>
        <button aria-pressed={!verMapa} onClick={() => setVerMapa(false)}>Lista</button>
      </div>
    </div>
    <div className="row">
      <span className="note">{origen.real ? "Distancias desde tu ubicación" : "Distancias desde el centro de la ciudad"}</span>
      <button className="btn ghost sm" onClick={onUbicarme}>Usar mi ubicación</button>
    </div>
    {lista.length === 0 ? <div className="empty">Todavía no hay veterinarias cargadas.</div>
      : verMapa ? <>
          <MapaVets vets={lista} origen={origen} sel={sel} onSel={setSel} />
          {elegida ? <VetCard v={elegida} sel={true} {...props} /> : <div className="empty">Tocá un marcador del mapa para ver la veterinaria.</div>}
        </>
      : <div className="list">{lista.map(v => <VetCard key={v.id} v={v} {...props} />)}</div>}
  </>;
}

function ElegirMascota({ mascotas, valor, onChange, onNueva }) {
  if (mascotas.length === 0) return <div className="empty">Primero cargá la ficha de tu mascota.
    <button type="button" className="btn" onClick={onNueva}>Agregar mascota</button></div>;
  return <div className="pick" role="radiogroup" aria-label="Mascota">
    {mascotas.map(m => <label key={m.id} className={valor === m.id ? "on" : ""}>
      <input type="radio" name="pick-mascota" checked={valor === m.id} onChange={() => onChange(m.id)} />
      <div className={claseAvatar(m)} style={{ width: "36px", height: "36px", fontSize: "1rem" }}>{inicial(m)}</div>
      <div style={{ minWidth: 0 }}><b>{m.nombre}</b>
        <div className="note">{m.especie} · {m.raza} · {edadTexto(m.nacimiento)}{m.alergias.length ? " · con alergias" : ""}</div></div>
    </label>)}
  </div>;
}

function SheetAviso({ vet, urgInicial, mascotas, onClose, onEnviar, onNueva }) {
  const [mid, setMid] = useState(mascotas[0] ? mascotas[0].id : null);
  const [f, setF] = useState({ urgencia: vet.puede.includes(urgInicial) ? urgInicial : vet.puede[0], detalle: "", llegada: "15" });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const m = mascotas.find(x => x.id === mid);
  return <Sheet onClose={onClose} titulo="Avisar urgencia">
    <h3>Avisar a {vet.nombre}</h3>
    <span className="note">La veterinaria recibe la ficha completa al instante y se prepara antes de que llegues.</span>
    <ElegirMascota mascotas={mascotas} valor={mid} onChange={setMid} onNueva={onNueva} />
    {m && <>
      {m.alergias.length > 0 && <div className="allergy">Se avisa que {m.nombre} es alérgico/a a: {m.alergias.join(", ")}</div>}
      <div className="form">
        <Campo label="Urgencia"><select id="a-urg" value={f.urgencia} onChange={set("urgencia")}>{vet.puede.map(p => <option key={p}>{p}</option>)}</select></Campo>
        <Campo label="Qué pasó"><textarea id="a-det" rows="2" value={f.detalle} onChange={set("detalle")} placeholder="Ej.: comió algo en la plaza y empezó a vomitar"></textarea></Campo>
        <Campo label="Llego en"><select id="a-lleg" value={f.llegada} onChange={set("llegada")}>{["5", "10", "15", "20", "30"].map(x => <option key={x} value={x}>{x} minutos</option>)}</select></Campo>
      </div>
      <span className="note">Esta app no da diagnósticos. Si podés, llamá al {vet.tel} mientras vas.</span>
    </>}
    <div className="row2"><button className="btn ghost" onClick={onClose}>Cancelar</button>
      <button className="btn urg" disabled={!m} onClick={() => onEnviar(vet, { mascota: m, ...f })}>Enviar aviso</button></div>
  </Sheet>;
}

function SheetTurno({ vet, servInicial, mascotas, ahora, turnos, onClose, onReservar, onNueva }) {
  const [mid, setMid] = useState(mascotas[0] ? mascotas[0].id : null);
  const [servicio, setServicio] = useState(vet.servicios.includes(servInicial) ? servInicial : vet.servicios[0]);
  const [cuando, setCuando] = useState("hoy");
  const [slot, setSlot] = useState(null);
  const fecha = cuando === "hoy" ? ahora.fecha : sumarDias(1);
  const { r, ex } = rangos(vet, fecha, "consulta");
  const slots = slotsDe(r, cuando === "hoy" ? (ahora.hora + 1) * 60 : 0);
  const ocupados = turnos.filter(t => t.vetId === vet.id && t.fecha === fechaISO(fecha)).map(t => t.slot);
  const m = mascotas.find(x => x.id === mid);
  return <Sheet onClose={onClose} titulo="Pedir turno">
    <h3>Turno en {vet.nombre}</h3>
    <ElegirMascota mascotas={mascotas} valor={mid} onChange={setMid} onNueva={onNueva} />
    {m && <>
      <Campo label="Servicio"><select id="t-serv" value={servicio} onChange={e => setServicio(e.target.value)}>{vet.servicios.map(s => <option key={s}>{s}</option>)}</select></Campo>
      <div className="seg small" role="group" aria-label="Día del turno">
        <button aria-pressed={cuando === "hoy"} onClick={() => { setCuando("hoy"); setSlot(null); }}>Hoy</button>
        <button aria-pressed={cuando === "mañana"} onClick={() => { setCuando("mañana"); setSlot(null); }}>Mañana</button>
      </div>
      {ex && <div className="aviso">{ex.cerrado ? (cuando === "hoy" ? "Hoy" : "Mañana") + " no atiende" : "Horario especial"}: {ex.motivo}</div>}
      {slots.length === 0
        ? <div className="empty">No quedan turnos {cuando}. Probá {cuando === "hoy" ? "mañana" : "otro día"}.</div>
        : <div className="chips" role="group" aria-label="Horario">{slots.map(s =>
            <button key={s} className="chip serv" disabled={ocupados.includes(s)} aria-pressed={slot === s} onClick={() => setSlot(s)}>{mmTexto(s)}</button>)}</div>}
    </>}
    <div className="row2"><button className="btn ghost" onClick={onClose}>Cancelar</button>
      <button className="btn" disabled={!m || slot === null} onClick={() => onReservar(vet, { mascota: m, servicio, cuando, fecha: fechaISO(fecha), slot })}>
        {slot === null ? "Elegí un horario" : "Reservar " + mmTexto(slot)}</button></div>
  </Sheet>;
}

/* ---------- turnos y avisos del dueño ---------- */
const ESTADOS = ["Enviado", "Confirmado", "Listos para atenderte"];
const pillEstado = e => e === "Enviado" ? "warn" : e === "Atendido" ? "no" : "ok";

function MisTurnos({ avisos, turnos, vets, pedidos, mascotas, avisar }) {
  const pedidosParaMi = pedidos.filter(p => mascotas.some(m => m.donante && m.especie === p.especie));
  const vacio = avisos.length === 0 && turnos.length === 0 && pedidosParaMi.length === 0;
  const vetDe = id => vets.find(x => x.id === id) || { nombre: "Veterinaria", barrio: "", tel: "" };
  return <>
    <h2>Turnos y avisos</h2>
    {pedidosParaMi.map(p => {
      const v = vetDe(p.vetId); const m = mascotas.find(x => x.donante && x.especie === p.especie);
      return <article className="card" key={p.id} style={{ borderColor: "var(--alert)" }}>
        <div className="row"><h3>Pedido de donación de sangre</h3><span className="pill alert">Urgente</span></div>
        <div>{v.nombre} necesita un {p.especie === "Perro" ? "perro" : "gato"} donante. {m.nombre} está registrado/a como donante.</div>
        <div className="note">{v.barrio} · Tel. {v.tel}</div>
        <button className="btn urg" onClick={() => avisar("Le avisamos a " + v.nombre + " que podés ir con " + m.nombre)}>Puedo ir con {m.nombre}</button>
      </article>;
    })}
    {vacio && <div className="empty">Todavía no tenés turnos ni avisos. Buscá una veterinaria en la pestaña Buscar.</div>}
    {turnos.length > 0 && <>
      <div className="note" style={{ fontWeight: "bold" }}>Turnos</div>
      <div className="list">{turnos.map(t => {
        const v = vetDe(t.vetId);
        return <article className="card" key={t.id}>
          <div className="row"><h3>{t.mascota.nombre}: {t.servicio}</h3><span className="pill ok">{fechaCorta(t.fecha)} {mmTexto(t.slot)}</span></div>
          <div className="note">{v.nombre} · {v.direccion || v.barrio} · Tel. {v.tel}</div>
        </article>;
      })}</div>
    </>}
    {avisos.length > 0 && <>
      <div className="note" style={{ fontWeight: "bold" }}>Avisos de urgencia</div>
      <div className="list">{avisos.map(a => {
        const v = vetDe(a.vetId); const paso = a.estado === "Atendido" ? 3 : ESTADOS.indexOf(a.estado) + 1;
        return <article className="card" key={a.id}>
          <div className="row"><h3>{a.mascota.nombre} → {v.nombre}</h3><span className={"pill " + pillEstado(a.estado)}>{a.estado}</span></div>
          <div className="steps" aria-label={"Paso " + paso + " de 3"}>{[1, 2, 3].map(i => <span key={i} className={i <= paso ? "on" : ""}></span>)}</div>
          <div className="note">{a.urgencia} · llegás en {a.llegada} min · Tel. {v.tel}</div>
          {a.estado === "Enviado" && <div className="note">Esperando que la veterinaria confirme.</div>}
        </article>;
      })}</div>
    </>}
  </>;
}

function CambiarPass({ backend, avisar }) {
  const vacio = { actual: "", nueva: "", nueva2: "" };
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState(vacio);
  const [err, setErr] = useState({});
  const [cargando, setCargando] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const guardar = async e => {
    e.preventDefault();
    const er = {};
    if (!f.actual) er.actual = "Escribí tu contraseña actual.";
    const pe = passError(f.nueva); if (pe) er.nueva = pe;
    if (f.nueva2 !== f.nueva) er.nueva2 = "Las contraseñas no coinciden.";
    setErr(er); if (Object.keys(er).length) return;
    setCargando(true);
    try { const msg = await backend.cambiarPass(f.actual, f.nueva); avisar(msg); setF(vacio); setAbierto(false); }
    catch (x) { setErr({ ...(x.campos || {}), general: x.campos ? "" : x.message }); }
    setCargando(false);
  };
  if (!abierto) return <button className="btn ghost" onClick={() => setAbierto(true)}>Cambiar contraseña</button>;
  return <form className="card form" onSubmit={guardar} noValidate>
    <b>Cambiar contraseña</b>
    <Campo label="Contraseña actual" error={err.actual}><input id="c-actual" type="password" autoComplete="current-password" value={f.actual} onChange={set("actual")} /></Campo>
    <Campo label="Contraseña nueva" error={err.nueva}><input id="c-nueva" type="password" autoComplete="new-password" value={f.nueva} onChange={set("nueva")} /></Campo>
    <ReglasPass pass={f.nueva} />
    <Campo label="Repetir contraseña nueva" error={err.nueva2}><input id="c-nueva2" type="password" autoComplete="new-password" value={f.nueva2} onChange={set("nueva2")} /></Campo>
    <span className="note">Al cambiarla se cierra la sesión en tus otros dispositivos.</span>
    {err.general && <span className="errtxt">{err.general}</span>}
    <div className="row2"><button type="button" className="btn ghost" onClick={() => { setAbierto(false); setF(vacio); setErr({}); }}>Cancelar</button>
      <button type="submit" className="btn" disabled={cargando}>{cargando ? "Guardando…" : "Guardar"}</button></div>
  </form>;
}

function UltimosIngresos({ backend }) {
  const [lista, setLista] = useState(null);
  useEffect(() => { backend.ingresos().then(setLista).catch(() => setLista([])); }, []);
  const fecha = f => { const d = new Date(f.replace(" ", "T")); return fechaCorta(fechaISO(d)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  return <>
    <h2>Últimos ingresos</h2>
    <p className="note" style={{ margin: 0 }}>Si ves un ingreso que no reconocés, cambiá tu contraseña.</p>
    {lista === null ? <Huellitas />
      : lista.length === 0 ? <div className="empty">Todavía no hay ingresos registrados.</div>
      : <div className="card"><dl className="kv">{lista.map((i, k) => <React.Fragment key={k}>
          <dt>{fecha(i.fecha)}</dt><dd>{i.dispositivo} · {["::1", "127.0.0.1"].includes(i.ip) ? "esta computadora" : i.ip}</dd></React.Fragment>)}</dl></div>}
  </>;
}

function Cuenta({ usuario, extra, salir, backend, avisar }) {
  return <>
    <h2>Mi cuenta</h2>
    <div className="card"><dl className="kv">
      <dt>Nombre</dt><dd>{usuario.nombre}</dd>
      <dt>Email</dt><dd>{usuario.email}</dd>
      <dt>Tipo</dt><dd>{usuario.rol === "vet" ? "Veterinaria" : "Dueño de mascotas"}</dd>
      {extra}
    </dl></div>
    <CambiarPass backend={backend} avisar={avisar} />
    <button className="btn ghost" onClick={salir}>Cerrar sesión</button>
    <UltimosIngresos backend={backend} />
  </>;
}

function AppDueno({ usuario, setUsuario, backend, vets, ahora, origen, onUbicarme, avisos, setAvisos, turnos, setTurnos, pedidos, avisar, salir }) {
  const [tab, setTab] = useState("buscar");
  const [masc, setMasc] = useState({ modo: "lista" });
  const [sheet, setSheet] = useState(null);
  const irNueva = () => { setSheet(null); setTab("mascotas"); setMasc({ modo: "nueva" }); };
  const guardarMascota = async m => {
    const existe = !!m.id;
    const g = await backend.guardarMascota(m);
    setUsuario(u => ({ ...u, mascotas: existe ? u.mascotas.map(x => x.id === g.id ? g : x) : [...u.mascotas, g] }));
    setMasc({ modo: "ver", id: g.id }); window.scrollTo(0, 0);
    avisar(existe ? "Ficha actualizada" : g.nombre + " se agregó a tus mascotas");
  };
  const borrarMascota = async id => {
    try { await backend.borrarMascota(id); setUsuario(u => ({ ...u, mascotas: u.mascotas.filter(x => x.id !== id) })); setMasc({ modo: "lista" }); avisar("Ficha borrada"); }
    catch (e) { avisar(e.message, true); }
  };
  const misAvisos = avisos.filter(a => a.duenoId === usuario.id);
  const misTurnos = turnos.filter(t => t.duenoId === usuario.id);
  const dueno = { nombre: usuario.nombre, tel: usuario.tel };
  const enviarAviso = (vet, d) => {
    setAvisos(p => [{ id: uid("a"), vetId: vet.id, duenoId: usuario.id, dueno, estado: "Enviado", ...d }, ...p]);
    setSheet(null); setTab("turnos"); avisar("Aviso enviado a " + vet.nombre);
  };
  const reservar = (vet, d) => {
    setTurnos(p => [...p, { id: uid("t"), vetId: vet.id, duenoId: usuario.id, dueno, ...d }]);
    setSheet(null); setTab("turnos"); avisar("Turno reservado para " + d.cuando + " a las " + mmTexto(d.slot));
  };
  const badge = misAvisos.filter(a => a.estado !== "Atendido").length + pedidos.filter(p => usuario.mascotas.some(m => m.donante && m.especie === p.especie)).length;
  return <>
    <Top sub={"Hola, " + usuario.nombre.split(" ")[0]} />
    <main className="app">
      {tab === "buscar" && <Buscar vets={vets} ahora={ahora} origen={origen} onUbicarme={onUbicarme}
        onAvisar={(v, u) => setSheet({ tipo: "aviso", vet: v, filtro: u })} onTurno={(v, s) => setSheet({ tipo: "turno", vet: v, filtro: s })} />}
      {tab === "mascotas" && <Mascotas mascotas={usuario.mascotas} estado={masc} setEstado={e => { setMasc(e); window.scrollTo(0, 0); }} onGuardar={guardarMascota} onBorrar={borrarMascota} />}
      {tab === "turnos" && <MisTurnos avisos={misAvisos} turnos={misTurnos} vets={vets} pedidos={pedidos} mascotas={usuario.mascotas} avisar={avisar} />}
      {tab === "cuenta" && <Cuenta usuario={usuario} salir={salir} backend={backend} avisar={avisar} extra={<>
        <dt>Teléfono</dt><dd>{usuario.tel}</dd><dt>Barrio</dt><dd>{usuario.barrio}</dd><dt>Mascotas</dt><dd>{usuario.mascotas.length}</dd></>} />}
    </main>
    <BottomNav tab={tab} setTab={t => { setTab(t); if (t === "mascotas") setMasc({ modo: "lista" }); }} tabs={[
      { k: "buscar", l: "Buscar", i: "buscar" }, { k: "mascotas", l: "Mascotas", i: "mascota" },
      { k: "turnos", l: "Turnos", i: "turnos", badge }, { k: "cuenta", l: "Cuenta", i: "cuenta" }]} />
    {sheet && sheet.tipo === "aviso" && <SheetAviso vet={sheet.vet} urgInicial={sheet.filtro} mascotas={usuario.mascotas} onClose={() => setSheet(null)} onEnviar={enviarAviso} onNueva={irNueva} />}
    {sheet && sheet.tipo === "turno" && <SheetTurno vet={sheet.vet} servInicial={sheet.filtro} mascotas={usuario.mascotas} ahora={ahora} turnos={turnos} onClose={() => setSheet(null)} onReservar={reservar} onNueva={irNueva} />}
  </>;
}

/* ---------- horarios de la veterinaria ---------- */
function EditorFranjas({ idBase, franjas, onChange, vacio }) {
  const cambiar = (i, j, valor) => onChange(franjas.map((f, k) => k === i ? (j === 0 ? [valor, f[1]] : [f[0], valor]) : f));
  const agregar = () => {
    const ult = franjas[franjas.length - 1];
    onChange([...franjas, franjas.length === 0 ? [9, 13] : [Math.min(23, ult[1] + 3), Math.min(24, ult[1] + 7)]]);
  };
  return <div className="franjas">
    {franjas.length === 0 && <span className="note">{vacio}</span>}
    {franjas.map(([a, b], i) => <div className="franja" key={i}>
      <SelHora id={idBase + "-" + i + "-a"} label="Desde" value={String(a)} onChange={e => cambiar(i, 0, +e.target.value)} />
      <span className="note">a</span>
      <SelHora id={idBase + "-" + i + "-b"} label="Hasta" value={String(b)} onChange={e => cambiar(i, 1, +e.target.value)} />
      <button type="button" className="quitar" aria-label="Quitar franja" onClick={() => onChange(franjas.filter((_, k) => k !== i))}>×</button>
    </div>)}
    {franjas.length < 4 && <button type="button" className="back" onClick={agregar}>+ Agregar franja</button>}
  </div>;
}

function HorarioSemanal({ vet, onGuardar }) {
  const [h, setH] = useState(() => copia(vet.horario));
  const [abierto, setAbierto] = useState(null);
  const [err, setErr] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiado = JSON.stringify(h) !== JSON.stringify(vet.horario);
  const setDia = (d, tipo, franjas) => { const n = copia(h); n[d][tipo] = franjas; setH(n); setErr(""); };
  const copiar = d => {
    const destino = (d >= 1 && d <= 5) ? [1, 2, 3, 4, 5] : [0, 6];
    const n = copia(h); destino.forEach(x => { n[x] = copia(h[d]); }); setH(n);
  };
  const guardar = async () => {
    const e = validarHorario(h); if (e) { setErr(e); return; }
    setGuardando(true);
    try { await onGuardar(ordenarHorario(h)); setErr(""); }
    catch (x) { setErr(x.message); }
    setGuardando(false);
  };
  return <>
    <h2>Horario semanal</h2>
    <p className="note" style={{ margin: 0 }}>Es el horario de todas las semanas. Para un día puntual usá "Días especiales".</p>
    <div className="list">{ORDEN_DIAS.map(d => {
      const abiertoDia = abierto === d;
      return <div className="card" key={d}>
        <button type="button" className="dayhead" onClick={() => setAbierto(abiertoDia ? null : d)} aria-expanded={abiertoDia}>
          <b>{DIAS[d]}</b><span className="chev">{abiertoDia ? "Cerrar" : "Editar"}</span>
          <span className="note">Consultas: {rangosTexto(h[d].consulta) || "no atiende"} · Guardia: {rangosTexto(h[d].guardia) || "no"}</span>
        </button>
        {abiertoDia && <>
          <div className="field" style={{ color: "var(--fg)" }}><b>Consultas con turno</b>
            <EditorFranjas idBase={"c" + d} franjas={h[d].consulta} vacio="No atiende consultas este día." onChange={f => setDia(d, "consulta", f)} /></div>
          <div className="field" style={{ color: "var(--fg)" }}><b>Guardia de urgencias</b>
            <EditorFranjas idBase={"g" + d} franjas={h[d].guardia} vacio="No hace guardia este día." onChange={f => setDia(d, "guardia", f)} />
            <div className="row" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="btn ghost sm" onClick={() => setDia(d, "guardia", [[0, 24]])}>Guardia las 24 h</button>
              <button type="button" className="btn ghost sm" onClick={() => setDia(d, "guardia", [])}>Sin guardia</button>
            </div></div>
          <button type="button" className="btn ghost" onClick={() => copiar(d)}>Copiar este horario a {d >= 1 && d <= 5 ? "lunes a viernes" : "sábado y domingo"}</button>
        </>}
      </div>;
    })}</div>
    {err && <span className="errtxt">{err}</span>}
    {cambiado && <div className="row2"><button className="btn ghost" onClick={() => { setH(copia(vet.horario)); setErr(""); }}>Descartar</button>
      <button className="btn" disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar horario"}</button></div>}
  </>;
}

function DiasEspeciales({ vet, onAgregar, onQuitar }) {
  const hoy = fechaISO(new Date());
  const vacio = { fecha: fechaISO(sumarDias(1)), modo: "cerrado", aplica: "ambos", abre: "9", cierra: "13", motivo: "Feriado" };
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const [guardando, setGuardando] = useState(false);
  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const proximos = (vet.excepciones || []).filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hoyCerrado = proximos.some(e => e.fecha === hoy && e.aplica === "ambos" && e.cerrado);
  const enviar = async datos => {
    setGuardando(true);
    try { await onAgregar(datos); setForm(null); setErr({}); }
    catch (x) { setErr({ ...(x.campos || {}), general: x.message }); }
    setGuardando(false);
  };
  const guardar = e => {
    e.preventDefault();
    const er = {};
    if (!form.fecha || form.fecha < hoy) er.fecha = "Elegí hoy o una fecha futura.";
    if (form.modo === "especial" && +form.abre >= +form.cierra) er.horas = "La hora de cierre tiene que ser después de la de apertura.";
    setErr(er); if (Object.keys(er).length) return;
    enviar({ fecha: form.fecha, aplica: form.aplica, cerrado: form.modo === "cerrado",
      abre: form.modo === "cerrado" ? null : +form.abre, cierra: form.modo === "cerrado" ? null : +form.cierra, motivo: form.motivo.trim() || "Cambio de horario" });
  };
  const aplicaTexto = a => a === "ambos" ? "consultas y guardia" : a === "consulta" ? "solo consultas" : "solo guardia";
  return <>
    <h2>Días especiales</h2>
    <p className="note" style={{ margin: 0 }}>Feriados, vacaciones o un día que no atienden. Los dueños ven el cambio y el motivo.</p>
    {!hoyCerrado && <button className="btn urg" disabled={guardando}
      onClick={() => enviar({ fecha: hoy, aplica: "ambos", cerrado: true, abre: null, cierra: null, motivo: "Cerrado por hoy" })}>Hoy no atendemos</button>}
    {proximos.length === 0 ? <div className="empty">No hay días especiales cargados.</div>
      : <div className="list">{proximos.map(e => {
          const d = deISO(e.fecha);
          return <div className="card exrow" key={e.id}>
            <div className="cal" aria-hidden="true"><span>{DIAS_CORTOS[d.getDay()]}</span><b>{d.getDate()}</b></div>
            <div style={{ minWidth: 0 }}><b>{fechaCorta(e.fecha)} · {e.cerrado ? "Cerrado" : hhmm(e.abre) + " a " + hhmm(e.cierra)}</b>
              <div className="note">{e.motivo} · {aplicaTexto(e.aplica)}</div></div>
            <button className="btn ghost sm" onClick={() => onQuitar(e.id)}>Quitar</button>
          </div>;
        })}</div>}
    {form
      ? <form className="card form" onSubmit={guardar} noValidate>
          <b>Nuevo día especial</b>
          <Campo label="Fecha" error={err.fecha}><input id="e-fecha" type="date" min={hoy} max={fechaISO(sumarDias(365))} value={form.fecha} onChange={set("fecha")} /></Campo>
          <Campo label="Qué pasa ese día"><select id="e-modo" value={form.modo} onChange={set("modo")}>
            <option value="cerrado">No atendemos</option><option value="especial">Atendemos en otro horario</option></select></Campo>
          <Campo label="Afecta a"><select id="e-aplica" value={form.aplica} onChange={set("aplica")}>
            <option value="ambos">Consultas y guardia</option><option value="consulta">Solo consultas</option><option value="guardia">Solo guardia</option></select></Campo>
          {form.modo === "especial" && <div className="grid2">
            <Campo label="Abre" error={err.horas}><SelHora id="e-abre" value={form.abre} onChange={set("abre")} /></Campo>
            <Campo label="Cierra"><SelHora id="e-cierra" value={form.cierra} onChange={set("cierra")} /></Campo></div>}
          <Campo label="Motivo (lo ven los dueños)"><input id="e-motivo" maxLength="80" value={form.motivo} onChange={set("motivo")} /></Campo>
          <div className="chips">{MOTIVOS.map(mo => <button type="button" key={mo} className="chip serv" aria-pressed={form.motivo === mo} onClick={() => setForm({ ...form, motivo: mo })}>{mo}</button>)}</div>
          {err.general && <span className="errtxt">{err.general}</span>}
          <div className="row2"><button type="button" className="btn ghost" onClick={() => { setForm(null); setErr({}); }}>Cancelar</button>
            <button type="submit" className="btn" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button></div>
        </form>
      : <button className="btn ghost" onClick={() => setForm(vacio)}>+ Agregar día especial</button>}
    {err.general && !form && <span className="errtxt">{err.general}</span>}
  </>;
}

function UbicacionVet({ vet, onGuardar }) {
  const [p, setP] = useState({ lat: vet.lat, lng: vet.lng });
  const [guardando, setGuardando] = useState(false);
  const cambiado = p.lat !== vet.lat || p.lng !== vet.lng;
  return <>
    <h2>Ubicación en el mapa</h2>
    <p className="note" style={{ margin: 0 }}>Arrastrá el marcador o tocá el mapa si la veterinaria no aparece en el lugar correcto.</p>
    <div className="card mapbox"><ElegirUbicacion valor={{ lat: vet.lat, lng: vet.lng }} onChange={setP} /></div>
    {cambiado && <button className="btn" disabled={guardando} onClick={async () => { setGuardando(true); try { await onGuardar(p); } catch (e) { } setGuardando(false); }}>
      {guardando ? "Guardando…" : "Guardar ubicación"}</button>}
  </>;
}

function AppVet({ usuario, backend, miVet, setMiVet, ahora, avisos, setAvisos, turnos, pedidos, setPedidos, avisar, salir }) {
  const [tab, setTab] = useState("pacientes");
  const [esp, setEsp] = useState("Perro");
  const [donantes, setDonantes] = useState(null);
  const v = miVet;
  useEffect(() => {
    if (tab !== "donantes") return;
    setDonantes(null);
    backend.donantes(esp).then(setDonantes).catch(() => setDonantes([]));
  }, [tab, esp]);
  const accion = async (fn, ok) => {
    try { const nv = await fn(); setMiVet(nv); if (ok) avisar(ok); }
    catch (e) { avisar(e.message, true); throw e; }
  };
  const mios = avisos.filter(a => a.vetId === v.id);
  const activos = mios.filter(a => a.estado !== "Atendido");
  const misTurnos = turnos.filter(t => t.vetId === v.id).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.slot - b.slot);
  const siguiente = { "Enviado": "Confirmado", "Confirmado": "Listos para atenderte", "Listos para atenderte": "Atendido" };
  const boton = { "Enviado": "Confirmar", "Confirmado": "Avisar que estamos listos", "Listos para atenderte": "Marcar como atendido" };
  const cambiarEstado = (id, estado) => { setAvisos(p => p.map(a => a.id === id ? { ...a, estado } : a)); avisar("Estado: " + estado); };
  const pedidoActivo = pedidos.find(p => p.vetId === v.id && p.especie === esp);
  const guardiaOn = abiertaAhora(v, ahora);
  const hoyC = horarioDelDia(v, ahora.fecha, "consulta"), hoyG = horarioDelDia(v, ahora.fecha, "guardia");
  return <>
    <Top sub={v.nombre} />
    <main className="app">
      {!v.verificada && <div className="aviso">Tu veterinaria está pendiente de verificación. Cuando un administrador revise la matrícula, va a aparecer para los dueños.</div>}

      {tab === "pacientes" && <>
        <div className="stat3">
          <div className="stat"><b>{activos.length}</b><span>En camino</span></div>
          <div className="stat"><b>{mios.length - activos.length}</b><span>Atendidos</span></div>
          <div className="stat"><b>{misTurnos.length}</b><span>Turnos</span></div>
        </div>
        <h2>Pacientes en camino</h2>
        {activos.length === 0
          ? <div className="empty">No hay avisos por ahora. Cuando un dueño toque "Voy en camino", aparece acá con la ficha de la mascota.</div>
          : <div className="list">{activos.map(a => <div key={a.id} className="list" style={{ gap: "8px" }}>
              <div className="row"><span className="pill alert">{a.urgencia}</span><span className="note">Llega en {a.llegada} min · {a.estado}</span></div>
              <Ficha m={a.mascota} compacta={true} />
              {a.detalle && <div className="card"><span className="note">Qué pasó</span>{a.detalle}</div>}
              <div className="note">Dueño: {a.dueno.nombre} · Tel. {a.dueno.tel}</div>
              <button className="btn" onClick={() => cambiarEstado(a.id, siguiente[a.estado])}>{boton[a.estado]}</button>
            </div>)}</div>}
        <h2>Turnos de consulta</h2>
        {misTurnos.length === 0 ? <div className="empty">Sin turnos todavía.</div>
          : <div className="list">{misTurnos.map(t => <article className="card" key={t.id}>
              <h3>{fechaCorta(t.fecha)} {mmTexto(t.slot)} · {t.servicio}</h3>
              <div>{t.mascota.nombre} ({t.mascota.especie}, {t.mascota.raza}, {edadTexto(t.mascota.nacimiento)})</div>
              {t.mascota.alergias.length > 0 && <div className="allergy">Alergias: {t.mascota.alergias.join(", ")}</div>}
              <div className="note">Dueño: {t.dueno.nombre} · Tel. {t.dueno.tel}</div>
            </article>)}</div>}
      </>}

      {tab === "horarios" && <>
        <h2>Ahora</h2>
        <div className="card">
          <div className="row"><b>Guardia {guardiaOn ? "visible como abierta" : "no visible ahora"}</b>
            <span className={"pill " + (guardiaOn ? "ok" : "no")}>{guardiaOn ? "Abierta" : "Cerrada"}</span></div>
          <div className="note">Hoy: consultas {hoyC.texto} · guardia {hoyG.texto}{(hoyC.ex || hoyG.ex) ? " (" + (hoyC.ex || hoyG.ex).motivo + ")" : ""}</div>
          <label className="chk"><input id="v-abierta" type="checkbox" checked={v.abierta}
            onChange={e => accion(() => backend.estadoGuardia({ abierta: e.target.checked })).catch(() => { })} />
            {v.abierta ? "Recibiendo urgencias" : "Guardia pausada (no aparece en el mapa)"}</label>
          <Campo label="Tiempo de espera actual"><select id="v-espera" value={String(v.espera)}
            onChange={e => accion(() => backend.estadoGuardia({ espera: +e.target.value }), "Tiempo de espera actualizado").catch(() => { })}>
            {[5, 10, 15, 20, 25, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutos</option>)}</select></Campo>
        </div>
        <DiasEspeciales vet={v} onAgregar={e => accion(() => backend.agregarDiaEspecial(e), "Día especial guardado")}
          onQuitar={id => accion(() => backend.quitarDiaEspecial(id), "Día especial quitado").catch(() => { })} />
        <HorarioSemanal key={JSON.stringify(v.horario)} vet={v} onGuardar={h => accion(() => backend.guardarHorario(h), "Horario guardado")} />
      </>}

      {tab === "donantes" && <>
        <h2>Pedir donantes de sangre</h2>
        <p className="note" style={{ margin: 0 }}>Si un paciente necesita una transfusión, la app avisa a los dueños de mascotas registradas como donantes.</p>
        <div className="seg" role="group" aria-label="Especie">
          <button aria-pressed={esp === "Perro"} onClick={() => setEsp("Perro")}>Perros</button>
          <button aria-pressed={esp === "Gato"} onClick={() => setEsp("Gato")}>Gatos</button>
        </div>
        {donantes === null ? <Huellitas />
          : donantes.length === 0 ? <div className="empty">No hay donantes registrados de esta especie.</div>
          : <div className="list">{donantes.map(m => <div className="card" key={m.id} style={{ flexDirection: "row", alignItems: "center" }}>
              <div className={claseAvatar(m)}>{inicial(m)}</div>
              <div style={{ minWidth: 0 }}><b>{m.nombre}</b>
                <div className="note">{m.raza} · {m.peso ? m.peso + " kg · " : ""}{edadTexto(m.nacimiento)} · {m.barrio}</div></div>
            </div>)}</div>}
        {pedidoActivo
          ? <div className="card"><b>Pedido enviado</b><span className="note">Los dueños lo ven en su pestaña Turnos.</span>
              <button className="btn ghost" onClick={() => { setPedidos(p => p.filter(x => x.id !== pedidoActivo.id)); avisar("Pedido cerrado"); }}>Ya conseguimos donante</button></div>
          : <button className="btn urg big" disabled={!donantes || donantes.length === 0}
              onClick={() => { setPedidos(p => [...p, { id: uid("p"), vetId: v.id, especie: esp }]); avisar("Pedido enviado a " + donantes.length + " dueños"); }}>Enviar pedido urgente</button>}
      </>}

      {tab === "perfil" && <>
        <Cuenta usuario={usuario} salir={salir} backend={backend} avisar={avisar} extra={<>
          <dt>Matrícula</dt><dd>{usuario.matricula}</dd><dt>Clínica</dt><dd>{v.nombre}</dd><dt>Dirección</dt><dd>{v.direccion}</dd><dt>Teléfono</dt><dd>{v.tel}</dd>
          <dt>Urgencias</dt><dd>{v.puede.join(", ") || "No hace guardia"}</dd><dt>Servicios</dt><dd>{v.servicios.join(", ") || "Solo guardia"}</dd></>} />
        <UbicacionVet key={v.lat + "," + v.lng} vet={v} onGuardar={p => accion(() => backend.guardarUbicacion(p), "Ubicación guardada")} />
      </>}
    </main>
    <BottomNav tab={tab} setTab={setTab} tabs={[
      { k: "pacientes", l: "Pacientes", i: "pacientes", badge: activos.length }, { k: "horarios", l: "Horarios", i: "horarios" },
      { k: "donantes", l: "Donantes", i: "donantes" }, { k: "perfil", l: "Perfil", i: "cuenta" }]} />
  </>;
}

/* ---------- ingreso y registro ---------- */
function Bienvenida({ ir, demo, backend }) {
  const [cargando, setCargando] = useState(false);
  const probar = async email => { setCargando(true); try { await demo(email); } catch (e) { setCargando(false); } };
  return <main className="app">
    <div className="hero"><Ilustracion /><h1>Guardia Vet MDP</h1>
      <p>Encontrá veterinarias de guardia y pedí turnos en Mar del Plata, con la ficha de tus mascotas siempre a mano.</p></div>
    <button className="btn big" onClick={() => ir("registro")}>Crear cuenta</button>
    <button className="btn ghost big" onClick={() => ir("login")}>Ya tengo cuenta</button>
    <div className="card"><b>Probar con cuentas de ejemplo</b>
      <span className="note">Enviá un aviso como dueño, cerrá sesión y entrá como veterinaria para recibirlo con la ficha de la mascota.</span>
      <div className="row2">
        <button className="btn ghost" disabled={cargando} onClick={() => probar("dueno@ejemplo.com")}>Dueño</button>
        <button className="btn ghost" disabled={cargando} onClick={() => probar("vet@ejemplo.com")}>Veterinaria</button>
      </div>
    </div>
  </main>;
}

function Login({ onLogin, volver, ir }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);
  const enviar = async e => {
    e.preventDefault();
    if (!email.trim() || !pass) { setErr("Completá el email y la contraseña."); return; }
    setCargando(true); setErr("");
    try { await onLogin(email.trim().toLowerCase(), pass); }
    catch (x) { setErr(x.message); setCargando(false); }
  };
  return <main className="app">
    <button className="back" onClick={volver}>← Volver</button>
    <div style={{ maxWidth: "200px", alignSelf: "center" }}><Ilustracion /></div>
    <h2>Ingresar</h2>
    <form className="form" onSubmit={enviar} noValidate>
      <Campo label="Email"><input id="l-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></Campo>
      <Campo label="Contraseña"><input id="l-pass" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} /></Campo>
      {err && <span className="errtxt">{err}</span>}
      <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Ingresando…" : "Ingresar"}</button>
      <div className="row">
        <button type="button" className="back" onClick={() => ir("recuperar")}>¿Olvidaste tu contraseña?</button>
        <button type="button" className="back" onClick={() => ir("olvide-email")}>¿Olvidaste tu email?</button>
      </div>
      <span className="note">Cuentas de ejemplo: dueno@ejemplo.com o vet@ejemplo.com, contraseña Demo1234!</span>
    </form>
  </main>;
}

// "¿Olvidaste tu contraseña?": pide el email y manda un enlace de un solo uso
function Recuperar({ backend, ir, onEnlace }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const enviar = async e => {
    e.preventDefault();
    if (!emailOk(email)) { setErr("Escribí un email válido, por ejemplo nombre@gmail.com."); return; }
    setCargando(true); setErr("");
    try { setRes(await backend.recuperar(email.trim().toLowerCase())); }
    catch (x) { setErr(x.message); }
    setCargando(false);
  };
  return <main className="app">
    <button className="back" onClick={() => ir("login")}>← Volver a ingresar</button>
    <h2>Recuperar contraseña</h2>
    {!res ? <form className="form" onSubmit={enviar} noValidate>
        <p className="note" style={{ margin: 0 }}>Escribí el email de tu cuenta. Te mandamos un enlace para crear una contraseña nueva. Vale por 60 minutos y se usa una sola vez.</p>
        <Campo label="Email" error={err}><input id="rec-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Campo>
        <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Enviando…" : "Enviar enlace"}</button>
        <button type="button" className="back" onClick={() => ir("olvide-email")}>No me acuerdo el email</button>
      </form>
      : <>
        <div className="card"><b>Revisá tu correo</b><span>{res.mensaje}</span></div>
        {res.enlaceDemo && <div className="card" style={{ borderColor: "var(--sol)" }}>
          <b>Modo de prueba</b>
          <span className="note">En la versión real este enlace solo llega por correo. Para la presentación se muestra acá.</span>
          <button className="btn" onClick={() => onEnlace(new URLSearchParams(res.enlaceDemo.split("?")[1]).get("recuperar"))}>Abrir el enlace</button>
        </div>}
        <button className="btn ghost" onClick={() => ir("login")}>Volver a ingresar</button>
      </>}
  </main>;
}

// "¿Olvidaste tu email?": busca por teléfono y muestra el email a medias
function OlvideEmail({ backend, ir }) {
  const [tel, setTel] = useState("");
  const [err, setErr] = useState("");
  const [emails, setEmails] = useState(null);
  const [cargando, setCargando] = useState(false);
  const buscar = async e => {
    e.preventDefault();
    if (tel.replace(/\D/g, "").length < 8) { setErr("Escribí el teléfono con característica, por ejemplo 223 555 1234."); return; }
    setCargando(true); setErr("");
    try { setEmails(await backend.olvideEmail(tel)); }
    catch (x) { setErr((x.campos && x.campos.tel) || x.message); }
    setCargando(false);
  };
  return <main className="app">
    <button className="back" onClick={() => ir("login")}>← Volver a ingresar</button>
    <h2>Recuperar email</h2>
    <form className="form" onSubmit={buscar} noValidate>
      <p className="note" style={{ margin: 0 }}>Escribí el teléfono que usaste al registrarte. Por seguridad mostramos solo una parte del email.</p>
      <Campo label="Teléfono" error={err}><input id="oe-tel" type="tel" autoComplete="tel" value={tel} onChange={e => setTel(e.target.value)} placeholder="223 555 1234" /></Campo>
      <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Buscando…" : "Buscar mi cuenta"}</button>
    </form>
    {emails && (emails.length === 0
      ? <div className="empty">No encontramos cuentas con ese teléfono. Probá con otro o creá una cuenta nueva.</div>
      : <div className="card"><b>{emails.length === 1 ? "Tu cuenta es:" : "Encontramos estas cuentas:"}</b>
          {emails.map(e => <span key={e} style={{ fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>{e}</span>)}
          <div className="row2"><button className="btn ghost" onClick={() => ir("login")}>Ingresar</button>
            <button className="btn" onClick={() => ir("recuperar")}>Recuperar contraseña</button></div>
        </div>)}
  </main>;
}

// Pantalla a la que lleva el enlace del correo: crear la contraseña nueva
function Restablecer({ backend, token, ir, onListo }) {
  const [email, setEmail] = useState(null);
  const [invalido, setInvalido] = useState("");
  const [f, setF] = useState({ pass: "", pass2: "" });
  const [err, setErr] = useState({});
  const [cargando, setCargando] = useState(false);
  useEffect(() => { backend.verificarEnlace(token).then(setEmail).catch(x => setInvalido(x.message)); }, [token]);
  const guardar = async e => {
    e.preventDefault();
    const er = {};
    const pe = passError(f.pass); if (pe) er.pass = pe;
    if (f.pass2 !== f.pass) er.pass2 = "Las contraseñas no coinciden.";
    setErr(er); if (Object.keys(er).length) return;
    setCargando(true);
    try { onListo(await backend.restablecer(token, f.pass)); }
    catch (x) { if (x.campos) setErr(x.campos); else setInvalido(x.message); setCargando(false); }
  };
  return <main className="app">
    <h2>Crear contraseña nueva</h2>
    {invalido ? <>
        <div className="allergy">{invalido}</div>
        <button className="btn" onClick={() => ir("recuperar")}>Pedir un enlace nuevo</button>
      </>
      : email === null ? <Huellitas />
      : <form className="form" onSubmit={guardar} noValidate>
          <p className="note" style={{ margin: 0 }}>Cuenta: <b>{email}</b></p>
          <Campo label="Contraseña nueva" error={err.pass}><input id="rs-pass" type="password" autoComplete="new-password" value={f.pass} onChange={e => setF({ ...f, pass: e.target.value })} /></Campo>
          <ReglasPass pass={f.pass} />
          <Campo label="Repetir contraseña" error={err.pass2}><input id="rs-pass2" type="password" autoComplete="new-password" value={f.pass2} onChange={e => setF({ ...f, pass2: e.target.value })} /></Campo>
          <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Guardando…" : "Guardar contraseña"}</button>
        </form>}
  </main>;
}

function Registro({ onCrear, volver }) {
  const [rol, setRol] = useState(null);
  const [f, setF] = useState({
    nombre: "", email: "", tel: "", barrio: "Centro", pass: "", pass2: "", clinica: "", matricula: "", direccion: "", ubic: null,
    abre: "9", cierra: "20", abreFinde: "", cierraFinde: "13", guardia: "no", gAbre: "20", gCierra: "8", urg: [], serv: ["Control general", "Vacunación"], acepto: false
  });
  const [err, setErr] = useState({});
  const [errGeneral, setErrGeneral] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [foco, setFoco] = useState(null);
  const [msgUbic, setMsgUbic] = useState("");
  const set = k => e => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggle = (k, x) => setF({ ...f, [k]: f[k].includes(x) ? f[k].filter(y => y !== x) : [...f[k], x] });

  const ubicar = async () => {
    if (f.direccion.trim().length < 5) { setErr({ ...err, direccion: "Escribí la dirección primero." }); return; }
    setBuscando(true); setMsgUbic("");
    let p = null;
    try { p = await buscarDireccion(f.direccion.trim()); } catch (e) { }
    const destino = p || f.ubic || CENTRO_MDP;
    setF(x => ({ ...x, ubic: { lat: destino.lat, lng: destino.lng } })); setFoco({ ...destino });
    setMsgUbic(p ? "Encontramos la dirección. Revisá que el marcador esté en la puerta de la veterinaria."
      : "No encontramos esa dirección. Mové el marcador hasta la veterinaria.");
    setBuscando(false);
  };

  if (!rol) return <main className="app">
    <button className="back" onClick={volver}>← Volver</button>
    <h2>¿Cómo vas a usar la app?</h2>
    <button className="card pet" onClick={() => setRol("dueno")}><div className="avatar"><CaraMascota especie="Perro" /></div>
      <div className="info"><h3>Tengo mascotas</h3><div className="note">Buscá guardias, pedí turnos y guardá la ficha de cada mascota.</div></div><span aria-hidden="true">›</span></button>
    <button className="card pet" onClick={() => setRol("vet")}><div className="avatar gato" style={{ color: "var(--vet)" }}><Cruz size={26} /></div>
      <div className="info"><h3>Soy una veterinaria</h3><div className="note">Publicá tus horarios y guardias, recibí avisos y turnos.</div></div><span aria-hidden="true">›</span></button>
  </main>;

  const esVet = rol === "vet";
  const crear = async e => {
    e.preventDefault();
    const er = {};
    if (f.nombre.trim().length < 3) er.nombre = "Escribí nombre y apellido.";
    if (!emailOk(f.email)) er.email = "Escribí un email válido, por ejemplo nombre@gmail.com.";
    if (f.tel.replace(/\D/g, "").length < 8) er.tel = "Escribí un teléfono con característica, por ejemplo 223 555 1234.";
    const pe = passError(f.pass, f.email); if (pe) er.pass = pe;
    if (f.pass2 !== f.pass) er.pass2 = "Las contraseñas no coinciden.";
    if (esVet) {
      if (f.clinica.trim().length < 3) er.clinica = "Escribí el nombre de la veterinaria.";
      if (!/^MV\s?\d{3,6}$/i.test(f.matricula.trim())) er.matricula = "Escribí la matrícula como MV seguida del número, por ejemplo MV 4521.";
      if (f.direccion.trim().length < 5) er.direccion = "Escribí la dirección.";
      if (!f.ubic) er.ubicacion = "Tocá \"Buscar la dirección en el mapa\" para marcar dónde está la veterinaria.";
      if (+f.abre >= +f.cierra || (f.abreFinde !== "" && +f.abreFinde >= +f.cierraFinde)) er.horario = "El horario de cierre tiene que ser después de la apertura.";
      if (f.guardia !== "no" && f.urg.length === 0) er.urg = "Elegí al menos una urgencia que atiendan.";
      if (f.serv.length === 0 && f.guardia === "no") er.serv = "Elegí al menos un servicio o indicá que hacen guardia.";
    }
    if (!f.acepto) er.acepto = "Tenés que aceptar los términos para crear la cuenta.";
    setErr(er); setErrGeneral("");
    if (Object.keys(er).length) { window.scrollTo(0, 0); return; }
    const datos = { rol, nombre: f.nombre.trim(), email: f.email.trim().toLowerCase(), tel: f.tel.trim(), barrio: f.barrio, pass: f.pass, acepto: f.acepto };
    if (esVet) {
      const lv = f.serv.length ? H(+f.abre, +f.cierra) : [];
      const finde = f.serv.length && f.abreFinde !== "" ? H(+f.abreFinde, +f.cierraFinde) : [];
      const g = f.guardia === "24" ? [[0, 24]] : f.guardia === "horario" ? H(+f.gAbre, +f.gCierra) : [];
      Object.assign(datos, {
        clinica: f.clinica.trim(), matricula: f.matricula.trim(), direccion: f.direccion.trim(), lat: f.ubic.lat, lng: f.ubic.lng,
        servicios: f.serv, urgencias: f.guardia === "no" ? [] : f.urg, horario: ordenarHorario(armarHorario({ semana: lv, finde }, { semana: g, finde: g }))
      });
    }
    setCargando(true);
    try { await onCrear(datos); }
    catch (x) { setErr(x.campos || {}); setErrGeneral(x.message); setCargando(false); window.scrollTo(0, 0); }
  };
  const n = Object.keys(err).length;
  return <main className="app">
    <button className="back" onClick={() => { setRol(null); setErr({}); setErrGeneral(""); }}>← Volver</button>
    <h2>{esVet ? "Registrar veterinaria" : "Crear cuenta"}</h2>
    {n > 0 ? <div className="allergy">Revisá {n === 1 ? "el campo marcado" : "los " + n + " campos marcados"} en rojo.</div>
      : errGeneral && <div className="allergy">{errGeneral}</div>}
    <form className="form" onSubmit={crear} noValidate>
      <fieldset><legend>{esVet ? "Responsable" : "Tus datos"}</legend>
        <Campo label={esVet ? "Nombre del veterinario/a responsable" : "Nombre y apellido"} error={err.nombre}><input id="r-nombre" autoComplete="name" value={f.nombre} onChange={set("nombre")} /></Campo>
        <Campo label="Email" error={err.email}><input id="r-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Campo>
        <Campo label="Teléfono" error={err.tel}><input id="r-tel" type="tel" autoComplete="tel" value={f.tel} onChange={set("tel")} /></Campo>
        <Campo label="Barrio"><select id="r-barrio" value={f.barrio} onChange={set("barrio")}>{BARRIOS.map(b => <option key={b}>{b}</option>)}</select></Campo>
      </fieldset>
      {esVet && <>
        <fieldset><legend>Veterinaria</legend>
          <Campo label="Nombre de la veterinaria" error={err.clinica}><input id="r-clinica" value={f.clinica} onChange={set("clinica")} /></Campo>
          <Campo label="Matrícula profesional" error={err.matricula}><input id="r-mat" value={f.matricula} onChange={set("matricula")} placeholder="MV 4521" /></Campo>
          <Campo label="Dirección" error={err.direccion}><input id="r-dir" autoComplete="street-address" value={f.direccion} onChange={set("direccion")} placeholder="Calle y número" /></Campo>
        </fieldset>
        <fieldset><legend>Ubicación en el mapa</legend>
          <span className="note">Buscamos la dirección con OpenStreetMap. Si el marcador no quedó justo, arrastralo o tocá el lugar correcto.</span>
          <button type="button" className="btn ghost" onClick={ubicar} disabled={buscando}>{buscando ? "Buscando…" : "Buscar la dirección en el mapa"}</button>
          {msgUbic && <span className="note">{msgUbic}</span>}
          {f.ubic && <ElegirUbicacion valor={f.ubic} foco={foco} onChange={p => setF(x => ({ ...x, ubic: p }))} />}
          {err.ubicacion && <span className="errtxt">{err.ubicacion}</span>}
        </fieldset>
        <fieldset><legend>Atención con turno</legend>
          <div className="grid2"><Campo label="Lun. a vie. abre" error={err.horario}><SelHora id="r-abre" value={f.abre} onChange={set("abre")} /></Campo>
            <Campo label="Cierra"><SelHora id="r-cierra" value={f.cierra} onChange={set("cierra")} /></Campo></div>
          <div className="grid2"><Campo label="Sáb. y dom. abre"><SelHora id="r-abref" value={f.abreFinde} onChange={set("abreFinde")} conCerrado={true} /></Campo>
            {f.abreFinde !== "" && <Campo label="Cierra"><SelHora id="r-cierraf" value={f.cierraFinde} onChange={set("cierraFinde")} /></Campo>}</div>
          <div className="field">Servicios{err.serv && <span className="errtxt">{err.serv}</span>}
            <div className="checks">{SERVICIOS.map(s => <label key={s}><input type="checkbox" checked={f.serv.includes(s)} onChange={() => toggle("serv", s)} />{s}</label>)}</div></div>
          <span className="note">Después vas a poder ajustar cada día y cargar feriados desde Horarios.</span>
        </fieldset>
        <fieldset><legend>Guardia de urgencias</legend>
          <Campo label="¿Hacen guardia?"><select id="r-guardia" value={f.guardia} onChange={set("guardia")}>
            <option value="no">No hacemos guardia</option><option value="24">Sí, las 24 horas</option><option value="horario">Sí, en un horario</option></select></Campo>
          {f.guardia === "horario" && <div className="grid2"><Campo label="Desde"><SelHora id="r-gabre" value={f.gAbre} onChange={set("gAbre")} /></Campo>
            <Campo label="Hasta"><SelHora id="r-gcierra" value={f.gCierra} onChange={set("gCierra")} /></Campo></div>}
          {f.guardia !== "no" && <div className="field">Urgencias que atienden{err.urg && <span className="errtxt">{err.urg}</span>}
            <div className="checks">{URGENCIAS.map(u => <label key={u}><input type="checkbox" checked={f.urg.includes(u)} onChange={() => toggle("urg", u)} />{u}</label>)}</div></div>}
        </fieldset>
      </>}
      <fieldset><legend>Seguridad</legend>
        <Campo label="Contraseña" error={err.pass}><input id="r-pass" type="password" autoComplete="new-password" value={f.pass} onChange={set("pass")} /></Campo>
        <ReglasPass pass={f.pass} />
        <span className="note">Se guarda encriptada: nadie puede leerla, ni siquiera el administrador.</span>
        <Campo label="Repetir contraseña" error={err.pass2}><input id="r-pass2" type="password" autoComplete="new-password" value={f.pass2} onChange={set("pass2")} /></Campo>
      </fieldset>
      <label className="chk"><input id="r-acepto" type="checkbox" checked={f.acepto} onChange={set("acepto")} />Acepto los términos y la política de privacidad (Ley 25.326)</label>
      {err.acepto && <span className="errtxt">{err.acepto}</span>}
      <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Creando cuenta…" : esVet ? "Registrar veterinaria" : "Crear cuenta"}</button>
    </form>
  </main>;
}

/* ---------- componente principal ---------- */
function App() {
  const [backend, setBackend] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [miVet, setMiVetState] = useState(null);
  const [vets, setVets] = useState([]);
  const [pantalla, setPantalla] = useState("inicio");
  const [avisos, setAvisos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [origen, setOrigen] = useState(CENTRO_MDP);
  const [token, setToken] = useState(null);
  const [toast, setToast] = useState(null);
  const leerAhora = () => { const d = new Date(); return { fecha: d, hora: d.getHours() }; };
  const [ahora, setAhora] = useState(leerAhora);
  const avisar = (texto, error) => setToast({ texto, error });
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 3200); return () => clearTimeout(id); }, [toast]);

  const cargarVets = async be => { try { setVets(await be.vets()); } catch (e) { } };
  const entrarCon = async (u, be) => {
    if (u.rol === "vet") setMiVetState(await be.miVet());
    setUsuario(u); await cargarVets(be); window.scrollTo(0, 0);
  };
  // Si se abrió el enlace del correo (?recuperar=...), se guarda el código y se borra de la barra de direcciones
  useEffect(() => {
    try {
      const t = new URLSearchParams(location.search).get("recuperar");
      if (t && /^[a-f0-9]{64}$/.test(t)) { setToken(t); setPantalla("restablecer"); history.replaceState(null, "", location.pathname); }
    } catch (e) { }
  }, []);
  // Al abrir: si responde el PHP se usa el servidor; si no, modo demostración
  useEffect(() => {
    (async () => {
      try { const u = await backendPHP.sesion(); setBackend(backendPHP); await cargarVets(backendPHP); if (u) await entrarCon(u, backendPHP); }
      catch (e) { const demo = crearBackendDemo(); setBackend(demo); await cargarVets(demo); }
    })();
  }, []);
  // Cada minuto se actualiza la hora y la lista (por si una veterinaria cambió su horario)
  useEffect(() => {
    if (!backend) return;
    const id = setInterval(() => { setAhora(leerAhora()); if (usuario && usuario.rol === "dueno") cargarVets(backend); }, 60000);
    return () => clearInterval(id);
  }, [backend, usuario]);

  // Geolocalización del navegador (necesita HTTPS o localhost)
  const ubicarme = () => {
    if (!navigator.geolocation) { avisar("Este navegador no puede compartir la ubicación.", true); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setOrigen({ lat: p.coords.latitude, lng: p.coords.longitude, real: true }); avisar("Ordenado por cercanía a tu ubicación"); },
      () => avisar("No pudimos obtener tu ubicación. Revisá el permiso del navegador.", true),
      { enableHighAccuracy: true, timeout: 10000 });
  };
  const setMiVet = v => { setMiVetState(v); setVets(p => p.map(x => x.id === v.id ? v : x)); };
  const login = async (email, pass) => entrarCon(await backend.login(email, pass), backend);
  const crearCuenta = async datos => {
    const u = await backend.registro(datos);
    await entrarCon(u, backend);
    avisar(u.rol === "vet" ? "Veterinaria registrada" : "Cuenta creada. Cargá la ficha de tu mascota en Mascotas.");
  };
  const salir = async () => {
    try { await backend.salir(); } catch (e) { }
    setUsuario(null); setMiVetState(null); setPantalla("inicio"); window.scrollTo(0, 0);
  };

  let cuerpo = null;
  if (!backend) {
    cuerpo = <><Top sub="Mar del Plata" /><main className="app"><Huellitas /><p className="modo">Conectando…</p></main></>;
  } else if (!usuario) {
    const ir = p => { setPantalla(p); window.scrollTo(0, 0); };
    const subs = { login: "Ingresar", registro: "Crear cuenta", recuperar: "Recuperar contraseña", "olvide-email": "Recuperar email", restablecer: "Contraseña nueva" };
    const sub = subs[pantalla] || "Mar del Plata";
    cuerpo = <>
      <Top sub={sub} />
      {pantalla === "inicio" && <Bienvenida backend={backend} ir={p => { setPantalla(p); window.scrollTo(0, 0); }}
        demo={email => login(email, "Demo1234!").catch(e => { avisar(e.message, true); throw e; })} />}
      {pantalla === "login" && <Login onLogin={login} volver={() => setPantalla("inicio")} ir={ir} />}
      {pantalla === "recuperar" && <Recuperar backend={backend} ir={ir} onEnlace={t => { setToken(t); ir("restablecer"); }} />}
      {pantalla === "olvide-email" && <OlvideEmail backend={backend} ir={ir} />}
      {pantalla === "restablecer" && token && <Restablecer backend={backend} token={token} ir={ir}
        onListo={msg => { setToken(null); ir("login"); avisar(msg); }} />}
      {pantalla === "registro" && <Registro onCrear={crearCuenta} volver={() => setPantalla("inicio")} />}
    </>;
  } else if (usuario.rol === "dueno") {
    cuerpo = <AppDueno key={usuario.id} usuario={usuario} setUsuario={setUsuario} backend={backend} vets={vets} ahora={ahora}
      origen={origen} onUbicarme={ubicarme} avisos={avisos} setAvisos={setAvisos} turnos={turnos} setTurnos={setTurnos} pedidos={pedidos} avisar={avisar} salir={salir} />;
  } else if (miVet) {
    cuerpo = <AppVet key={usuario.id} usuario={usuario} backend={backend} miVet={miVet} setMiVet={setMiVet} ahora={ahora}
      avisos={avisos} setAvisos={setAvisos} turnos={turnos} pedidos={pedidos} setPedidos={setPedidos} avisar={avisar} salir={salir} />;
  }
  return <>
    {cuerpo}
    {toast && <div className={"toast" + (toast.error ? " error" : "")} role="status">{toast.texto}</div>}
  </>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
