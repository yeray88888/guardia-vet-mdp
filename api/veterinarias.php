<?php
// GET /api/veterinarias.php  → veterinarias verificadas con horarios y días especiales (público)
require __DIR__ . '/helpers.php';

if (metodo() !== 'GET') {
    fallar('Método no permitido.', 405);
}
responder(['veterinarias' => cargar_vets()]);
