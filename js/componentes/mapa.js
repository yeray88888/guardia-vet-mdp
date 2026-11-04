/* ============================================================
   Guardia Vet MDP · componentes/mapa.js
   Componentes del mapa (Leaflet + OpenStreetMap). Usan useRef para darle
   a Leaflet un div real donde dibujar, y useEffect para crear el mapa.
   ============================================================ */

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
    </div>
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
  </div>;
}
