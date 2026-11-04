/* ============================================================
   Guardia Vet MDP · componentes/dueno.js
   Pantallas del dueño: turnos y avisos, mi cuenta y la app del dueño (AppDueno).
   ============================================================ */

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
    {vacio && <div className="empty">Todavía no tenés turnos ni avisos.</div>}
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
