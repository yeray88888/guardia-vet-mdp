<?php
// GET /api/donantes.php?especie=Perro  → mascotas registradas como donantes (solo veterinarias)
// No devuelve datos de contacto del dueño: el pedido le llega al dueño por la app.
require __DIR__ . '/helpers.php';

requerir('vet');
$especie = $_GET['especie'] ?? '';
if (!in_array($especie, ['Perro', 'Gato'], true)) {
    fallar('La especie tiene que ser Perro o Gato.');
}
$st = db()->prepare('SELECT m.id, m.nombre, m.raza, m.peso, m.nacimiento, u.barrio
    FROM mascotas m JOIN usuarios u ON u.id = m.dueno_id
    WHERE m.donante = 1 AND m.especie = ? ORDER BY m.nombre');
$st->execute([$especie]);
$lista = array_map(fn($m) => [
    'id' => (string)$m['id'], 'nombre' => $m['nombre'], 'especie' => $especie, 'raza' => $m['raza'],
    'peso' => $m['peso'] === null ? '' : rtrim(rtrim(number_format((float)$m['peso'], 2, '.', ''), '0'), '.'),
    'nacimiento' => $m['nacimiento'], 'barrio' => $m['barrio'],
], $st->fetchAll());
responder(['donantes' => $lista]);
