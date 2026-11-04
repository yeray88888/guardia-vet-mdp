<?php
// POST /api/olvide_email.php  {tel}
// "¿Olvidaste tu email?": busca por teléfono y muestra el email a medias (ma******@gmail.com).
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$d = cuerpo();
$tel = digitos(texto($d['tel'] ?? '', 30));
if (strlen($tel) < 8) {
    fallar('Escribí el teléfono con característica.', 422, ['tel' => 'Escribí el teléfono con característica, por ejemplo 223 555 1234.']);
}
limitar_ip('email', 5, 15);

// Se comparan los últimos 8 números, así funciona con o sin el 0 y el 223
$st = db()->prepare('SELECT email FROM usuarios WHERE telefono_digitos LIKE ? ORDER BY id');
$st->execute(['%' . substr($tel, -8)]);
$emails = array_map('enmascarar_email', $st->fetchAll(PDO::FETCH_COLUMN));
responder(['emails' => $emails]);
