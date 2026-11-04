/* ============================================================
   Guardia Vet MDP · componentes/buscar.js
   Buscar veterinarias (urgencia o consulta), tarjetas, aviso de urgencia y turnos.
   ============================================================ */

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
    <ElegirMascota mascotas={mascotas} valor={mid} onChange={setMid} onNueva={onNueva} />
    {m && <>
      {m.alergias.length > 0 && <div className="allergy">Se avisa que {m.nombre} es alérgico/a a: {m.alergias.join(", ")}</div>}
      <div className="form">
        <Campo label="Urgencia"><select id="a-urg" value={f.urgencia} onChange={set("urgencia")}>{vet.puede.map(p => <option key={p}>{p}</option>)}</select></Campo>
        <Campo label="Qué pasó"><textarea id="a-det" rows="2" value={f.detalle} onChange={set("detalle")} placeholder="Ej.: comió algo en la plaza y empezó a vomitar"></textarea></Campo>
        <Campo label="Llego en"><select id="a-lleg" value={f.llegada} onChange={set("llegada")}>{["5", "10", "15", "20", "30"].map(x => <option key={x} value={x}>{x} minutos</option>)}</select></Campo>
      </div>
      <span className="note">Si podés, llamá al {vet.tel} mientras vas.</span>
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
