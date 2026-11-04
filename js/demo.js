/* ============================================================
   Guardia Vet MDP · demo.js
   Modo demostración: datos de ejemplo y un "servidor de mentira" en memoria.
   Se usa solo si no se encuentra el PHP (por ejemplo, en la página publicada).
   Tiene las mismas funciones que backendPHP en api.js.
   ============================================================ */

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
