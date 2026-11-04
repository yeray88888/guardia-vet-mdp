<?php
// Carga datos de ejemplo (veterinarias, dueños y mascotas) en una base vacía.
// Abrir UNA vez: http://localhost/guardia-vet/api/instalar.php (crea la base de datos si no existe)
// Solo funciona desde la misma computadora (localhost). Contraseña de todas las cuentas: Demo1234!
require __DIR__ . '/helpers.php';

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (PHP_SAPI !== 'cli' && !in_array($ip, ['127.0.0.1', '::1'], true)) {
    fallar('El instalador solo se puede usar desde la misma computadora del servidor.', 403);
}
// Si la base de datos todavía no existe en MySQL, la crea con database.sql (no hace falta usar phpMyAdmin)
if (str_starts_with($CONFIG['db_dsn'], 'mysql:')) {
    $sinBase = preg_replace('/dbname=[^;]*;?/', '', $CONFIG['db_dsn']);
    $servidor = new PDO($sinBase, $CONFIG['db_user'], $CONFIG['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    preg_match('/dbname=([^;]+)/', $CONFIG['db_dsn'], $m);
    $st = $servidor->prepare('SHOW DATABASES LIKE ?');
    $st->execute([$m[1] ?? 'guardia_vet']);
    if (!$st->fetchColumn()) {
        $sql = preg_replace('/--[^\n]*/', '', file_get_contents(__DIR__ . '/../database.sql'));
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $sentencia) {
            $servidor->exec($sentencia);
        }
    }
}

if ((int)db()->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0) {
    responder(['ok' => false, 'mensaje' => 'La base ya tiene datos. No se cargó nada para no pisar lo que existe.']);
}

// $dom: horario de consultas del domingo (si es null, usa el del sábado)
$H = function (array $lv, array $finde, array $glv, array $gfinde, ?array $dom = null): array {
    $h = [];
    for ($d = 0; $d < 7; $d++) {
        $esFinde = $d === 0 || $d === 6;
        $consulta = $d === 0 && $dom !== null ? $dom : ($esFinde ? $finde : $lv);
        $h[] = ['consulta' => $consulta, 'guardia' => $esFinde ? $gfinde : $glv];
    }
    return $h;
};
$todas = URGENCIAS;
$vets = [
    ['vet1@ejemplo.com', 'Dr. Pablo Sosa', 'MV 3810', 'Clínica Veterinaria Güemes', 'Los Pinares', 'Güemes 2850', '223 555-0101', 15, -38.018, -57.552,
        $H([[9, 13], [16, 20]], [[10, 13]], [[8, 24]], [[9, 21]]), ['Intoxicación', 'Herida o sangrado', 'Vómitos o diarrea'], ['Control general', 'Vacunación', 'Desparasitación', 'Peluquería']],
    ['vet2@ejemplo.com', 'Dra. Ana Ríos', 'MV 4102', 'Veterinaria del Puerto', 'Puerto', '12 de Octubre 3200', '223 555-0102', 10, -38.041, -57.546,
        $H([[9, 18]], [], [[9, 21]], []), ['Herida o sangrado', 'Vómitos o diarrea'], ['Control general', 'Vacunación', 'Desparasitación']],
    ['vet@ejemplo.com', 'Dra. Laura Gómez', 'MV 4521', 'Hospital Veterinario Constitución 24 h', 'Constitución', 'Av. Constitución 5100', '223 555-0103', 25, -37.9775, -57.565,
        $H([[8, 20]], [[9, 13]], [[0, 24]], [[0, 24]]), $todas, SERVICIOS],
    ['vet4@ejemplo.com', 'Dr. Martín Pardo', 'MV 3377', 'Centro Veterinario La Perla', 'La Perla', 'San Luis 1500', '223 555-0104', 20, -37.9925, -57.5505,
        $H([[9, 19]], [[10, 14]], [[8, 22]], [[10, 22]]), ['Intoxicación', 'Golpe o fractura', 'Vómitos o diarrea'], ['Control general', 'Vacunación', 'Castración']],
    ['vet5@ejemplo.com', 'Dra. Julia Vera', 'MV 4890', 'Guardia Veterinaria San Juan', 'San Juan', 'San Juan 2700', '223 555-0105', 30, -37.9985, -57.568,
        $H([], [], [[0, 8], [20, 24]], [[0, 24]]), ['Intoxicación', 'Golpe o fractura', 'Dificultad para respirar', 'Parto'], []],
    ['vet6@ejemplo.com', 'Dr. Tomás Gil', 'MV 3955', 'Veterinaria Los Troncos', 'Los Troncos', 'Rodríguez Peña 4100', '223 555-0106', 5, -38.023, -57.547,
        $H([[9, 20]], [[9, 13]], [[9, 20]], [[9, 13]]), ['Vómitos o diarrea', 'Herida o sangrado'], ['Control general', 'Vacunación', 'Peluquería']],
    ['vet7@ejemplo.com', 'Dra. Carla Núñez', 'MV 4233', 'Veterinaria Plaza Mitre', 'Centro', 'San Luis 2200', '223 555-0107', 0, -38.0, -57.556,
        $H([[9, 13], [16, 20]], [[10, 13]], [], []), [], ['Control general', 'Vacunación', 'Desparasitación', 'Peluquería']],
    ['vet8@ejemplo.com', 'Dr. Lucas Ortiz', 'MV 4675', 'Consultorio Veterinario Chauvín', 'Chauvín', 'Alberti 3400', '223 555-0108', 0, -38.012, -57.563,
        $H([[10, 19]], [], [], []), [], ['Control general', 'Vacunación', 'Castración']],
    // Veterinarias reales de Mar del Plata (datos de Google Maps). La cuenta y la matrícula son de prueba.
    ['layus@ejemplo.com', 'Cuenta de prueba Layús', 'MV 0000', 'Layús Clínica Veterinaria Integral', 'La Perla', '3 de Febrero 2765', '0223 577-3834', 20, -37.995217, -57.545974,
        $H([[0, 24]], [[0, 24]], [[0, 24]], [[0, 24]]), URGENCIAS, ['Control general', 'Vacunación']],
    ['cito@ejemplo.com', 'Cuenta de prueba Citopatología', 'MV 0000', 'Citopatología Veterinaria', 'Centro', '14 de Julio 1881', 'Instagram @cito.patologia.veterinaria', 0, -37.995218, -57.559147,
        $H([[9, 13], [16, 19]], [], [], []), [], ['Análisis y estudios']],
    ['rinconada@ejemplo.com', 'Cuenta de prueba La Rinconada', 'MV 0000', 'Veterinaria La Rinconada', 'Centro', 'Dorrego 1338', 'Sin teléfono cargado', 0, -37.990393, -57.556618,
        $H([[9, 13], [16, 20]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['acantilados@ejemplo.com', 'Cuenta de prueba Consultorio en Acantilados', 'MV 0000', 'Veterinaria Consultorio en Acantilados', 'Puerto', 'Gaboto 5916', '0223 502-7878', 0, -38.024277, -57.567859,
        $H([[9, 19]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Atención a domicilio']],
    ['cirugia@ejemplo.com', 'Cuenta de prueba Cirugía Tachauer', 'MV 0000', 'Cirugía Veterinaria Marcelo Tachauer', 'Los Troncos', 'Corrientes 3831', '0223 524-1066', 0, -38.017928, -57.55777,
        $H([[9, 19]], [], [], []), [], ['Cirugía', 'Castración', 'Control general']],
    ['lacucha@ejemplo.com', 'Cuenta de prueba La Cucha del Puerto', 'MV 0000', 'La Cucha del Puerto', 'Puerto', 'Av. Edison 415', '0223 480-7979', 0, -38.041615, -57.548541,
        $H([[9, 18]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['lobos@ejemplo.com', 'Cuenta de prueba Lobos', 'MV 0000', 'Veterinaria Lobos', 'Puerto', '12 de Octubre 4358', '0223 655-5902', 0, -38.036015, -57.55572,
        $H([[9, 15]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['delsur@ejemplo.com', 'Cuenta de prueba Del Sur', 'MV 0000', 'Veterinaria Del Sur', 'Villa Lourdes', 'Juan B. Justo 865', '0223 489-3126', 0, -38.034355, -57.550626,
        $H([[9, 15], [16, 20]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['argos@ejemplo.com', 'Cuenta de prueba Argos', 'MV 0000', 'Argos Veterinaria', 'Puerto', 'Av. Juan B. Justo 362', '0223 529-3333', 0, -38.037869, -57.546403,
        $H([[9, 17]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Peluquería']],
    ['cerrito@ejemplo.com', 'Cuenta de prueba Clínica Cerrito', 'MV 0000', 'Clínica Veterinaria (Cerrito 17)', 'Las Avenidas', 'Cerrito 17', 'Sin teléfono cargado', 0, -38.031293, -57.555786,
        $H([[9, 13], [17, 20]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['drpaz@ejemplo.com', 'Cuenta de prueba Dr. Paz', 'MV 0000', 'Veterinaria Dr. Paz', 'Los Troncos', 'Tucumán 4170', '0223 538-4870', 0, -38.022165, -57.556815,
        $H([[9, 18]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['arielperez@ejemplo.com', 'Cuenta de prueba Dr Ariel Perez', 'MV 0000', 'Centro Médico Veterinario Dr Ariel Perez', 'Peralta Ramos Oeste', 'Talcahuano 46', '0223 481-9560', 0, -38.022571, -57.566085,
        $H([[9, 16]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['aap@ejemplo.com', 'Cuenta de prueba A.A.P', 'MV 0000', 'A.A.P Veterinaria', 'Juramento', 'Av. Fortunato de la Plaza 5829', '0223 482-1036', 0, -38.036566, -57.581191,
        $H([[9, 13], [16, 20]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['delbosque@ejemplo.com', 'Cuenta de prueba Del Bosque', 'MV 0000', 'Veterinaria Del Bosque', 'Punta Mogotes', 'Av. Mario Bravo 2289', '0223 484-0516', 0, -38.068212, -57.560601,
        $H([[9, 13], [16, 20]], [[9, 13]], [], [], []), [], ['Control general', 'Vacunación', 'Desparasitación']],
    ['puntomascotas@ejemplo.com', 'Cuenta de prueba Punto Mascotas', 'MV 0000', 'Punto Mascotas Veterinaria', 'Centro', 'Corrientes 2999', '0223 494-6161', 0, -38.010754, -57.552383,
        $H([[9, 19]], [[9, 17]], [], [], []), [], ['Control general', 'Vacunación', 'Peluquería']],
];

$duenos = [
    ['dueno@ejemplo.com', 'Martina López', '223 555-0201', 'La Perla', [
        ['Toby', 'Perro', 'Labrador', 'Macho', '2021-03', 30, 1, 'Negro, mancha blanca en el pecho', '', '', '2026-04', '2026-04', '985112000654321', 1,
            'Se pone nervioso con otros perros en la sala de espera.', ['Penicilina', 'Pollo']],
        ['Mora', 'Gato', 'Siamés', 'Hembra', '2024-08', 3.8, 1, 'Crema con orejas oscuras', 'Asma felina', 'Inhalador de salbutamol cuando tiene crisis',
            '2025-09', '2025-09', null, 0, '', []],
        ['Pipo', 'Ave', 'Canario', 'Macho', '2025-01', 0.02, 0, '', '', '', null, null, null, 0, '', []],
    ]],
    ['diego@ejemplo.com', 'Diego Ferreyra', '223 555-0202', 'Constitución', [
        ['Thor', 'Perro', 'Ovejero Alemán', 'Macho', '2020-06', 34, 0, '', '', '', null, null, null, 1, '', []],
    ]],
    ['sofia@ejemplo.com', 'Sofía Ruiz', '223 555-0203', 'Centro', [
        ['Simón', 'Gato', 'Maine Coon', 'Macho', '2022-02', 6.5, 0, '', '', '', null, null, null, 1, '', []],
    ]],
];

$pdo = db();
$pdo->beginTransaction();
$hash = password_hash('Demo1234!', PASSWORD_DEFAULT);
$insU = $pdo->prepare('INSERT INTO usuarios (email, pass_hash, rol, nombre, telefono, telefono_digitos, barrio, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$idsVet = [];
foreach ($vets as [$email, $resp, $mat, $clinica, $barrio, $dir, $tel, $espera, $lat, $lng, $horario, $urg, $serv]) {
    $insU->execute([$email, $hash, 'vet', $resp, $tel, digitos($tel), $barrio, ahora_sql()]);
    $uid = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO veterinarias (usuario_id, nombre, matricula, direccion, barrio, telefono, lat, lng, verificada, espera_min) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)')
        ->execute([$uid, $clinica, $mat, $dir, $barrio, $tel, $lat, $lng, $espera]);
    $vid = (int)$pdo->lastInsertId();
    $idsVet[$clinica] = $vid;
    foreach ($serv as $s) {
        $pdo->prepare('INSERT INTO vet_servicios (vet_id, servicio) VALUES (?, ?)')->execute([$vid, $s]);
    }
    foreach ($urg as $x) {
        $pdo->prepare('INSERT INTO vet_urgencias (vet_id, urgencia) VALUES (?, ?)')->execute([$vid, $x]);
    }
    guardar_horario($vid, $horario);
}
// Días especiales de ejemplo
$insE = $pdo->prepare('INSERT INTO excepciones (vet_id, fecha, aplica, cerrado, abre, cierra, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)');
$insE->execute([$idsVet['Veterinaria Plaza Mitre'], date('Y-m-d', strtotime('+1 day')), 'ambos', 1, null, null, 'Capacitación del equipo']);
$insE->execute([$idsVet['Hospital Veterinario Constitución 24 h'], date('Y-m-d', strtotime('+3 days')), 'consulta', 0, 9, 13, 'Jornada de vacunación']);

$insM = $pdo->prepare('INSERT INTO mascotas (dueno_id, nombre, especie, raza, sexo, nacimiento, peso, castrado, color, condiciones, medicacion,
    antirrabica, vacuna_general, chip, donante, notas, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$insA = $pdo->prepare('INSERT INTO alergias (mascota_id, nombre) VALUES (?, ?)');
foreach ($duenos as [$email, $nombre, $tel, $barrio, $mascotas]) {
    $insU->execute([$email, $hash, 'dueno', $nombre, $tel, digitos($tel), $barrio, ahora_sql()]);
    $uid = (int)$pdo->lastInsertId();
    foreach ($mascotas as $m) {
        $alergias = array_pop($m);
        $insM->execute(array_merge([$uid], $m, [ahora_sql()]));
        $mid = (int)$pdo->lastInsertId();
        foreach ($alergias as $a) {
            $insA->execute([$mid, $a]);
        }
    }
}
$pdo->commit();

responder(['ok' => true, 'mensaje' => 'Datos de ejemplo cargados. Cuentas: dueno@ejemplo.com y vet@ejemplo.com, contraseña Demo1234!']);
