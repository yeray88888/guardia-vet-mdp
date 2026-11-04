<?php
// POST /api/cambiar_pass.php  {actual, nueva}  → cambia la contraseña de la cuenta logueada
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$u = requerir();
$d = cuerpo();
limitar_ip('cambiar', 10, 15);

$st = db()->prepare('SELECT pass_hash FROM usuarios WHERE id = ?');
$st->execute([$u['id']]);
$hash = $st->fetchColumn();

$actual = is_string($d['actual'] ?? null) ? $d['actual'] : '';
if (!password_verify($actual, $hash)) {
    fallar('Revisá los datos marcados.', 422, ['actual' => 'La contraseña actual no es correcta.']);
}
$nueva = $d['nueva'] ?? null;
if ($error = validar_pass($nueva, $u['email'])) {
    fallar('Revisá los datos marcados.', 422, ['nueva' => $error]);
}
if (password_verify($nueva, $hash)) {
    fallar('Revisá los datos marcados.', 422, ['nueva' => 'Tiene que ser distinta de la contraseña actual.']);
}

db()->prepare('UPDATE usuarios SET pass_hash = ?, pass_cambiada = ? WHERE id = ?')
    ->execute([password_hash($nueva, PASSWORD_DEFAULT), ahora_sql(), $u['id']]);
// Esta sesión sigue abierta; las sesiones en otros dispositivos se cierran solas
iniciar_sesion_de((int)$u['id']);
responder(['ok' => true, 'mensaje' => 'Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.']);
