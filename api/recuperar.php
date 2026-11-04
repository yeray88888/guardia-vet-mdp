<?php
// POST /api/recuperar.php  {email}
// "¿Olvidaste tu contraseña?": manda un enlace de un solo uso que vence en 60 minutos.
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$d = cuerpo();
$email = strtolower(texto($d['email'] ?? '', 190));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fallar('Escribí un email válido.', 422, ['email' => 'Escribí un email válido, por ejemplo nombre@gmail.com.']);
}
limitar_ip('recuperar', 10, 15);

// La respuesta es la misma exista o no la cuenta: así nadie puede averiguar qué emails están registrados
$respuesta = ['ok' => true, 'mensaje' => 'Si ese email tiene una cuenta, te mandamos un enlace para crear una contraseña nueva. Revisá también la carpeta de spam.'];

$st = db()->prepare('SELECT id, nombre FROM usuarios WHERE email = ?');
$st->execute([$email]);
$u = $st->fetch();

if ($u) {
    // Como mucho 3 enlaces por hora para cada cuenta
    $st = db()->prepare('SELECT COUNT(*) FROM recuperaciones WHERE usuario_id = ? AND creado > ?');
    $st->execute([$u['id'], date('Y-m-d H:i:s', time() - 3600)]);
    if ((int)$st->fetchColumn() < 3) {
        $token = bin2hex(random_bytes(32));                 // 64 caracteres al azar, imposible de adivinar
        $minutos = $CONFIG['recuperar_minutos'];
        db()->prepare('INSERT INTO recuperaciones (usuario_id, token_hash, expira, usado, creado, ip) VALUES (?, ?, ?, 0, ?, ?)')
            ->execute([$u['id'], hash('sha256', $token), date('Y-m-d H:i:s', time() + $minutos * 60), ahora_sql(), $_SERVER['REMOTE_ADDR'] ?? '']);
        $enlace = url_sitio() . '/?recuperar=' . $token;
        enviar_correo($email, 'Creá una contraseña nueva en Guardia Vet MDP',
            "Hola {$u['nombre']}:\n\n" .
            "Pediste crear una contraseña nueva. Entrá a este enlace (vale por $minutos minutos y se puede usar una sola vez):\n\n" .
            "$enlace\n\n" .
            "Si no fuiste vos, ignorá este correo: tu contraseña sigue siendo la misma.\n");
        if ($CONFIG['mostrar_enlace_demo']) {
            $respuesta['enlace_demo'] = $enlace;
        }
    }
}
responder($respuesta);
