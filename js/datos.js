/* ============================================================
   Guardia Vet MDP · datos.js
   Hooks de React, constantes y listas que usa toda la aplicación.
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


// Ficha vacía de una mascota (punto de partida del formulario)
const MASCOTA_VACIA = {
  nombre: "", especie: "Perro", raza: "", sexo: "Macho", nacimiento: "", peso: "", castrado: false, color: "",
  alergias: [], condiciones: "", medicacion: "", antirrabica: "", vacunaGeneral: "", chip: "", donante: false, notas: ""
};
