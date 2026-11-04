/* ============================================================
   Guardia Vet MDP · componentes/ingreso.js
   Bienvenida, ingresar, recuperar contraseña o email y crear cuenta.
   ============================================================ */

function Bienvenida({ ir, demo, backend }) {
  const [cargando, setCargando] = useState(false);
  const probar = async email => { setCargando(true); try { await demo(email); } catch (e) { setCargando(false); } };
  return <main className="app">
    <div className="hero"><Ilustracion /><h1>Guardia Vet MDP</h1>
      <p>Encontrá veterinarias de guardia y pedí turnos en Mar del Plata, con la ficha de tus mascotas siempre a mano.</p></div>
    <button className="btn big" onClick={() => ir("registro")}>Crear cuenta</button>
    <button className="btn ghost big" onClick={() => ir("login")}>Ya tengo cuenta</button>
    <div className="card"><b>Probar con cuentas de ejemplo</b>
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
        <p className="note" style={{ margin: 0 }}>Te mandamos un enlace para crear una contraseña nueva.</p>
        <Campo label="Email" error={err}><input id="rec-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Campo>
        <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Enviando…" : "Enviar enlace"}</button>
        <button type="button" className="back" onClick={() => ir("olvide-email")}>No me acuerdo el email</button>
      </form>
      : <>
        <div className="card"><b>Revisá tu correo</b><span>{res.mensaje}</span></div>
        {res.enlaceDemo && <div className="card" style={{ borderColor: "var(--sol)" }}>
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
      <p className="note" style={{ margin: 0 }}>Escribí el teléfono que usaste al registrarte.</p>
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
        <Campo label="Repetir contraseña" error={err.pass2}><input id="r-pass2" type="password" autoComplete="new-password" value={f.pass2} onChange={set("pass2")} /></Campo>
      </fieldset>
      <label className="chk"><input id="r-acepto" type="checkbox" checked={f.acepto} onChange={set("acepto")} />Acepto los términos y la política de privacidad (Ley 25.326)</label>
      {err.acepto && <span className="errtxt">{err.acepto}</span>}
      <button type="submit" className="btn big" disabled={cargando}>{cargando ? "Creando cuenta…" : esVet ? "Registrar veterinaria" : "Crear cuenta"}</button>
    </form>
  </main>;
}
