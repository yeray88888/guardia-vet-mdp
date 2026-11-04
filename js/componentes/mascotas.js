/* ============================================================
   Guardia Vet MDP · componentes/mascotas.js
   Ficha de la mascota, formulario para crearla o editarla y lista de mascotas.
   ============================================================ */

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
      </fieldset>

      <fieldset><legend>Identificación</legend>
        <Campo label="Color y señas particulares"><input id="m-color" value={f.color} onChange={set("color")} placeholder="Ayuda a reconocerlo si se pierde" /></Campo>
        <Campo label="Número de microchip (opcional)" error={err.chip}><input id="m-chip" inputMode="numeric" value={f.chip} onChange={set("chip")} placeholder="15 números" /></Campo>
        <Campo label="Notas para el veterinario"><textarea id="m-notas" rows="2" value={f.notas} onChange={set("notas")} placeholder="Ej.: muerde cuando tiene miedo"></textarea></Campo>
      </fieldset>

      {puedeDonar && <fieldset><legend>Donación de sangre</legend>
        <label className="chk"><input id="m-donante" type="checkbox" checked={f.donante} onChange={set("donante")} />Puede ser donante si una veterinaria lo necesita</label>
        <span className="note">{f.especie === "Perro" ? "Perros: más de 25 kg, entre 1 y 8 años y sanos." : "Gatos: más de 4 kg, entre 1 y 8 años y sanos."}</span>
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
