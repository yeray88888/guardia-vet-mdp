/* ============================================================
   Guardia Vet MDP · componentes/veterinaria.js
   Pantallas de la veterinaria: horario semanal, días especiales, ubicación
   y la app de la veterinaria (AppVet).
   ============================================================ */

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
          ? <div className="empty">No hay pacientes en camino.</div>
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
          ? <div className="card"><b>Pedido enviado</b>
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
