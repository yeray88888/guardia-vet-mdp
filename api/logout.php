<?php
// POST /api/logout.php  → cierra la sesión y borra la cookie
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
verificar_origen();

$_SESSION = [];
setcookie(session_name(), '', [
    'expires' => time() - 3600, 'path' => '/', 'secure' => $GV_HTTPS, 'httponly' => true, 'samesite' => 'Strict',
]);
session_destroy();
responder(['ok' => true]);
