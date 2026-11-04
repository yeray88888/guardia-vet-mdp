/* ============================================================
   Guardia Vet MDP · app.js
   Componente principal (App): decide qué pantalla mostrar según quién
   está logueado y arranca React. Se carga último, después de los demás archivos.

   Archivos de JavaScript (se cargan en este orden desde index.html):
     datos.js         constantes y hooks de React
     utilidades.js    funciones de horarios, fechas, distancias y contraseñas
     api.js           conexión con el servidor PHP (JSON)
     demo.js          modo demostración, si no hay servidor
     componentes/     las pantallas en React (comunes, mapa, mascotas, buscar,
                      dueno, veterinaria, ingreso)
     app.js           este archivo
   ============================================================ */

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
