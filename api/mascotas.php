<?php
// Mascotas del dueño logueado. Cada dueño solo puede ver y cambiar las suyas.
//   GET    /api/mascotas.php           → lista
//   POST   /api/mascotas.php           → crea
//   PUT    /api/mascotas.php?id=12     → edita
//   DELETE /api/mascotas.php?id=12     → borra
require __DIR__ . '/helpers.php';

$u = requerir('dueno');
$duenoId = (int)$u['id'];

function validar_mascota(array $d): array
{
    $c = [];
    $m = [];
    $m['nombre'] = texto($d['nombre'] ?? '', 40);
    if ($m['nombre'] === '') {
        $c['nombre'] = 'Escribí el nombre.';
    }
    $m['especie'] = in_array($d['especie'] ?? '', ESPECIES, true) ? $d['especie'] : '';
    if ($m['especie'] === '') {
        $c['especie'] = 'Elegí la especie.';
    }
    $m['raza'] = texto($d['raza'] ?? '', 60);
    if ($m['raza'] === '') {
        $c['raza'] = 'Escribí la raza. Si no sabés, poné Mestizo.';
    }
    $m['sexo'] = in_array($d['sexo'] ?? '', ['Macho', 'Hembra'], true) ? $d['sexo'] : 'Macho';

    $m['nacimiento'] = texto($d['nacimiento'] ?? '', 7);
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $m['nacimiento'])) {
        $c['nacimiento'] = 'Elegí el mes y año en que nació.';
    } elseif ($m['nacimiento'] > date('Y-m')) {
        $c['nacimiento'] = 'La fecha no puede ser futura.';
    }

    $peso = $d['peso'] ?? '';
    if ($peso === '' || $peso === null) {
        $m['peso'] = null;
    } elseif (!is_numeric($peso) || (float)$peso <= 0 || (float)$peso > 120) {
        $c['peso'] = 'Revisá el peso: tiene que estar entre 0 y 120 kg.';
    } else {
        $m['peso'] = round((float)$peso, 2);
    }

    $m['castrado'] = !empty($d['castrado']) ? 1 : 0;
    $m['color'] = texto($d['color'] ?? '', 120);
    $m['condiciones'] = texto($d['condiciones'] ?? '', 200);
    $m['medicacion'] = texto($d['medicacion'] ?? '', 200);
    $m['notas'] = texto($d['notas'] ?? '', 300);

    foreach (['antirrabica' => 'antirrabica', 'vacunaGeneral' => 'vacuna_general'] as $in => $col) {
        $v = texto($d[$in] ?? '', 7);
        if ($v !== '' && !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $v)) {
            $c[$in] = 'Fecha de vacuna inválida.';
        }
        $m[$col] = $v === '' ? null : $v;
    }

    $chip = texto($d['chip'] ?? '', 15);
    if ($chip !== '' && !preg_match('/^\d{15}$/', $chip)) {
        $c['chip'] = 'El microchip tiene 15 números.';
    }
    $m['chip'] = $chip === '' ? null : $chip;

    // Solo perros y gatos pueden registrarse como donantes de sangre
    $m['donante'] = (!empty($d['donante']) && in_array($m['especie'], ['Perro', 'Gato'], true)) ? 1 : 0;

    $alergias = [];
    foreach ((array)($d['alergias'] ?? []) as $a) {
        $a = texto($a, 60);
        if ($a !== '' && !in_array(mb_strtolower($a), array_map('mb_strtolower', $alergias), true)) {
            $alergias[] = $a;
        }
    }
    if (count($alergias) > 20) {
        $c['alergias'] = 'Podés cargar hasta 20 alergias.';
    }

    if ($c) {
        fallar('Revisá los datos marcados.', 422, $c);
    }
    return [$m, $alergias];
}

function guardar_alergias(int $mascotaId, array $alergias): void
{
    db()->prepare('DELETE FROM alergias WHERE mascota_id = ?')->execute([$mascotaId]);
    $st = db()->prepare('INSERT INTO alergias (mascota_id, nombre) VALUES (?, ?)');
    foreach ($alergias as $a) {
        $st->execute([$mascotaId, $a]);
    }
}

// Confirma que la mascota sea del dueño logueado
function id_propio(int $duenoId): int
{
    $id = (int)($_GET['id'] ?? 0);
    $st = db()->prepare('SELECT 1 FROM mascotas WHERE id = ? AND dueno_id = ?');
    $st->execute([$id, $duenoId]);
    if (!$st->fetchColumn()) {
        fallar('No encontramos esa mascota en tu cuenta.', 404);
    }
    return $id;
}

$columnas = ['nombre', 'especie', 'raza', 'sexo', 'nacimiento', 'peso', 'castrado', 'color', 'condiciones',
    'medicacion', 'antirrabica', 'vacuna_general', 'chip', 'donante', 'notas'];

switch (metodo()) {
    case 'GET':
        responder(['mascotas' => listar_mascotas($duenoId)]);

    case 'POST':
        [$m, $alergias] = validar_mascota(cuerpo());
        $st = db()->prepare('SELECT COUNT(*) FROM mascotas WHERE dueno_id = ?');
        $st->execute([$duenoId]);
        if ((int)$st->fetchColumn() >= 30) {
            fallar('Llegaste al máximo de 30 mascotas por cuenta.');
        }
        $pdo = db();
        $pdo->beginTransaction();
        $sql = 'INSERT INTO mascotas (dueno_id, creado, ' . implode(', ', $columnas) . ') VALUES (?, ?' . str_repeat(', ?', count($columnas)) . ')';
        $pdo->prepare($sql)->execute(array_merge([$duenoId, ahora_sql()], array_map(fn($k) => $m[$k], $columnas)));
        $id = (int)$pdo->lastInsertId();
        guardar_alergias($id, $alergias);
        $pdo->commit();
        responder(['mascota' => listar_mascotas($duenoId, $id)[0]], 201);

    case 'PUT':
        $id = id_propio($duenoId);
        [$m, $alergias] = validar_mascota(cuerpo());
        $pdo = db();
        $pdo->beginTransaction();
        $sql = 'UPDATE mascotas SET ' . implode(', ', array_map(fn($k) => "$k = ?", $columnas)) . ' WHERE id = ? AND dueno_id = ?';
        $pdo->prepare($sql)->execute(array_merge(array_map(fn($k) => $m[$k], $columnas), [$id, $duenoId]));
        guardar_alergias($id, $alergias);
        $pdo->commit();
        responder(['mascota' => listar_mascotas($duenoId, $id)[0]]);

    case 'DELETE':
        verificar_origen();
        $id = id_propio($duenoId);
        db()->prepare('DELETE FROM mascotas WHERE id = ? AND dueno_id = ?')->execute([$id, $duenoId]);
        responder(['ok' => true]);

    default:
        fallar('Método no permitido.', 405);
}
