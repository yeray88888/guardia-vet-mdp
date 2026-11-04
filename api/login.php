<?php
// POST /api/login.php  {email, pass}
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$d = cuerpo();
$email = strtolower(texto($d['email'] ?? '', 190));
$pass = is_string($d['pass'] ?? null) ? $d['pass'] : '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

// Freno a la fuerza bruta: muchos intentos fallidos con el mismo email bloquean un rato
$desde = date('Y-m-d H:i:s', time() - $CONFIG['bloqueo_min'] * 60);
$st = db()->prepare('SELECT COUNT(*) FROM intentos_login WHERE email = ? AND fecha > ?');
$st->execute([$email, $desde]);
if ((int)$st->fetchColumn() >= $CONFIG['max_intentos']) {
    fallar('Hubo demasiados intentos fallidos. Esperá ' . $CONFIG['bloqueo_min'] . ' minutos y probá de nuevo.', 429);
}

$st = db()->prepare('SELECT id, pass_hash FROM usuarios WHERE email = ?');
$st->execute([$email]);
$u = $st->fetch();

// Siempre se verifica un hash (real o de relleno) para que la respuesta tarde lo mismo
$ok = password_verify($pass, $u ? $u['pass_hash'] : HASH_FALSO) && $u;

if (!$ok) {
    db()->prepare('INSERT INTO intentos_login (email, ip, fecha) VALUES (?, ?, ?)')->execute([$email, $ip, ahora_sql()]);
    // Mismo mensaje si falla el email o la contraseña: así no se sabe qué cuentas existen
    fallar('El email o la contraseña no coinciden. Revisalos y probá de nuevo.', 401);
}

// Si PHP mejora el algoritmo de hash, se actualiza solo la próxima vez que la persona entra
if (password_needs_rehash($u['pass_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE usuarios SET pass_hash = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
}
db()->prepare('DELETE FROM intentos_login WHERE email = ?')->execute([$email]);

iniciar_sesion_de((int)$u['id']);
registrar_ingreso((int)$u['id']);
responder(['usuario' => datos_usuario((int)$u['id'])]);
