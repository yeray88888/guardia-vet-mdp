<?php
// POST /api/registro.php  → crea una cuenta de dueño o de veterinaria y deja la sesión iniciada
require __DIR__ . '/helpers.php';

if (metodo() !== 'POST') {
    fallar('Método no permitido.', 405);
}
$d = cuerpo();

$rol = $d['rol'] ?? '';
if (!in_array($rol, ['dueno', 'vet'], true)) {
    fallar('Elegí si la cuenta es de dueño o de veterinaria.');
}

// ---- Validación en el servidor (la de la web se puede saltear, esta no) ----
$campos = [];
$nombre = texto($d['nombre'] ?? '', 120);
if (mb_strlen($nombre) < 3) {
    $campos['nombre'] = 'Escribí nombre y apellido.';
}
$email = strtolower(texto($d['email'] ?? '', 190));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $campos['email'] = 'Escribí un email válido, por ejemplo nombre@gmail.com.';
}
$tel = texto($d['tel'] ?? '', 30);
if (strlen(preg_replace('/\D/', '', $tel)) < 8) {
    $campos['tel'] = 'Escribí un teléfono con característica, por ejemplo 223 555 1234.';
}
$barrio = texto($d['barrio'] ?? '', 60) ?: 'Otro';
$pass = is_string($d['pass'] ?? null) ? $d['pass'] : '';
if ($error = validar_pass($pass, $email)) {
    $campos['pass'] = $error;
}
if (empty($d['acepto'])) {
    $campos['acepto'] = 'Tenés que aceptar los términos para crear la cuenta.';
}

$vet = null;
if ($rol === 'vet') {
    $clinica = texto($d['clinica'] ?? '', 120);
    if (mb_strlen($clinica) < 3) {
        $campos['clinica'] = 'Escribí el nombre de la veterinaria.';
    }
    $matricula = strtoupper(texto($d['matricula'] ?? '', 20));
    if (!preg_match('/^MV\s?(\d{3,6})$/', $matricula, $m)) {
        $campos['matricula'] = 'Escribí la matrícula como MV seguida del número, por ejemplo MV 4521.';
    } else {
        $matricula = 'MV ' . $m[1];
    }
    $direccion = texto($d['direccion'] ?? '', 160);
    if (mb_strlen($direccion) < 5) {
        $campos['direccion'] = 'Escribí la dirección.';
    }
    $servicios = array_values(array_intersect(SERVICIOS, (array)($d['servicios'] ?? [])));
    $urgencias = array_values(array_intersect(URGENCIAS, (array)($d['urgencias'] ?? [])));
    $horario = validar_horario($d['horario'] ?? null);
    $hayGuardia = false;
    foreach ($horario as $dia) {
        if ($dia['guardia']) {
            $hayGuardia = true;
        }
    }
    if ($hayGuardia && !$urgencias) {
        $campos['urg'] = 'Elegí al menos una urgencia que atiendan.';
    }
    if (!$servicios && !$hayGuardia) {
        $campos['serv'] = 'Elegí al menos un servicio o indicá que hacen guardia.';
    }
    [$lat, $lng] = validar_ubicacion($d['lat'] ?? null, $d['lng'] ?? null);
    $vet = compact('clinica', 'matricula', 'direccion', 'servicios', 'urgencias', 'horario', 'lat', 'lng');
}

if ($campos) {
    fallar('Revisá los datos marcados.', 422, $campos);
}

$st = db()->prepare('SELECT 1 FROM usuarios WHERE email = ?');
$st->execute([$email]);
if ($st->fetchColumn()) {
    fallar('Ya hay una cuenta con ese email.', 409, ['email' => 'Ya hay una cuenta con ese email. Ingresá desde "Ya tengo cuenta".']);
}

// password_hash usa bcrypt con "sal" aleatoria: dos contraseñas iguales dan hashes distintos
$hash = password_hash($pass, PASSWORD_DEFAULT);

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('INSERT INTO usuarios (email, pass_hash, rol, nombre, telefono, telefono_digitos, barrio, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$email, $hash, $rol, $nombre, $tel, digitos($tel), $barrio, ahora_sql()]);
    $uid = (int)$pdo->lastInsertId();

    if ($vet) {
        $pdo->prepare('INSERT INTO veterinarias (usuario_id, nombre, matricula, direccion, barrio, telefono, lat, lng, verificada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$uid, $vet['clinica'], $vet['matricula'], $vet['direccion'], $barrio, $tel, $vet['lat'], $vet['lng'], $CONFIG['verificar_automatico'] ? 1 : 0]);
        $vid = (int)$pdo->lastInsertId();
        $s = $pdo->prepare('INSERT INTO vet_servicios (vet_id, servicio) VALUES (?, ?)');
        foreach ($vet['servicios'] as $x) {
            $s->execute([$vid, $x]);
        }
        $s = $pdo->prepare('INSERT INTO vet_urgencias (vet_id, urgencia) VALUES (?, ?)');
        foreach ($vet['urgencias'] as $x) {
            $s->execute([$vid, $x]);
        }
        guardar_horario($vid, $vet['horario']);
    }
    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    if ($e->getCode() === '23000') { // otro registro usó el mismo email al mismo tiempo
        fallar('Ya hay una cuenta con ese email.', 409, ['email' => 'Ya hay una cuenta con ese email.']);
    }
    throw $e;
}

iniciar_sesion_de($uid);
registrar_ingreso($uid);
responder(['usuario' => datos_usuario($uid)], 201);
