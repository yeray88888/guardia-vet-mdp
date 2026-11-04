<?php
// POST /api/restablecer.php
//   {token, solo_verificar: true}  → dice si el enlace sirve (y a qué cuenta, con el email enmascarado)
//   {token, pass}                  → guarda la contraseña nueva
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$d = cuerpo();
$token = is_string($d['token'] ?? null) ? $d['token'] : '';
if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    fallar('El enlace no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".', 400);
}

// En la base solo está el hash del enlace: aunque alguien la robe, no puede usar los enlaces
$st = db()->prepare('SELECT r.id, r.usuario_id, r.expira, r.usado, u.email
    FROM recuperaciones r JOIN usuarios u ON u.id = r.usuario_id WHERE r.token_hash = ?');
$st->execute([hash('sha256', $token)]);
$r = $st->fetch();
if (!$r || $r['usado'] || strtotime($r['expira']) < time()) {
    fallar('El enlace venció o ya se usó. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".', 410);
}
if (!empty($d['solo_verificar'])) {
    responder(['ok' => true, 'email' => enmascarar_email($r['email'])]);
}

$pass = $d['pass'] ?? null;
if ($error = validar_pass($pass, $r['email'])) {
    fallar('Revisá la contraseña.', 422, ['pass' => $error]);
}

$pdo = db();
$pdo->beginTransaction();
$pdo->prepare('UPDATE usuarios SET pass_hash = ?, pass_cambiada = ? WHERE id = ?')
    ->execute([password_hash($pass, PASSWORD_DEFAULT), ahora_sql(), $r['usuario_id']]);
// Se anulan todos los enlaces pendientes de la cuenta y se limpia el bloqueo por intentos fallidos
$pdo->prepare('UPDATE recuperaciones SET usado = 1 WHERE usuario_id = ?')->execute([$r['usuario_id']]);
$pdo->prepare('DELETE FROM intentos_login WHERE email = ?')->execute([$r['email']]);
$pdo->commit();

responder(['ok' => true, 'mensaje' => 'Listo, ya podés ingresar con tu contraseña nueva.']);
