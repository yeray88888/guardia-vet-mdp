<?php
// GET /api/ingresos.php  → los últimos 5 ingresos de la cuenta logueada
require __DIR__ . '/helpers.php';

$u = requerir();

// Convierte el "user agent" del navegador en algo legible: "Chrome en Android"
function navegador_legible(string $ua): string
{
    $nav = str_contains($ua, 'Edg/') ? 'Edge' : (str_contains($ua, 'Firefox') ? 'Firefox' : (str_contains($ua, 'Chrome') ? 'Chrome' : (str_contains($ua, 'Safari') ? 'Safari' : 'Otro navegador')));
    $so = str_contains($ua, 'Android') ? 'Android' : (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') ? 'iPhone' : (str_contains($ua, 'Windows') ? 'Windows' : (str_contains($ua, 'Mac') ? 'Mac' : (str_contains($ua, 'Linux') ? 'Linux' : 'otro sistema'))));
    return "$nav en $so";
}

$st = db()->prepare('SELECT fecha, ip, navegador FROM ingresos WHERE usuario_id = ? ORDER BY id DESC LIMIT 5');
$st->execute([$u['id']]);
responder(['ingresos' => array_map(fn($i) => [
    'fecha' => $i['fecha'], 'ip' => $i['ip'], 'dispositivo' => navegador_legible($i['navegador']),
], $st->fetchAll())]);
