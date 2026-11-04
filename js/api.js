/* ============================================================
   Guardia Vet MDP · api.js
   Conexión con el servidor PHP. Todas las pantallas piden datos por acá.
   Los pedidos y respuestas viajan en formato JSON.
   ============================================================ */

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
