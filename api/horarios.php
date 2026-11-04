<?php
// Horarios y estado de la veterinaria logueada. Solo cuentas de veterinaria.
//   GET    /api/horarios.php          → la veterinaria con su horario y días especiales
//   PUT    /api/horarios.php          → reemplaza el horario semanal  {horario: [7 días]}
//   PATCH  /api/horarios.php          → estado y ubicación            {abierta, espera, lat, lng}
//   POST   /api/horarios.php          → agrega un día especial        {fecha, aplica, cerrado, abre, cierra, motivo}
//   DELETE /api/horarios.php?id=5     → quita un día especial
require __DIR__ . '/helpers.php';

$u = requerir('vet');
$vetId = vet_id_de((int)$u['id']);

function mi_vet(int $vetId): never
{
    responder(['veterinaria' => cargar_vets($vetId)[0]]);
}

switch (metodo()) {
    case 'GET':
        mi_vet($vetId);

    case 'PUT':
        $d = cuerpo();
        $horario = validar_horario($d['horario'] ?? null);
        $pdo = db();
        $pdo->beginTransaction();
        guardar_horario($vetId, $horario);
        $pdo->commit();
        mi_vet($vetId);

    case 'PATCH':
        $d = cuerpo();
        if (array_key_exists('abierta', $d)) {
            db()->prepare('UPDATE veterinarias SET guardia_abierta = ? WHERE id = ?')->execute([$d['abierta'] ? 1 : 0, $vetId]);
        }
        if (array_key_exists('espera', $d)) {
            $espera = $d['espera'];
            if (!is_int($espera) || $espera < 0 || $espera > 240) {
                fallar('El tiempo de espera tiene que estar entre 0 y 240 minutos.', 422);
            }
            db()->prepare('UPDATE veterinarias SET espera_min = ? WHERE id = ?')->execute([$espera, $vetId]);
        }
        if (array_key_exists('lat', $d) || array_key_exists('lng', $d)) {
            [$lat, $lng] = validar_ubicacion($d['lat'] ?? null, $d['lng'] ?? null);
            db()->prepare('UPDATE veterinarias SET lat = ?, lng = ? WHERE id = ?')->execute([$lat, $lng, $vetId]);
        }
        mi_vet($vetId);

    case 'POST':
        $d = cuerpo();
        $campos = [];
        $fecha = texto($d['fecha'] ?? '', 10);
        $dt = DateTime::createFromFormat('!Y-m-d', $fecha);
        $hoy = new DateTime('today');
        if (!$dt || $dt->format('Y-m-d') !== $fecha) {
            $campos['fecha'] = 'Elegí una fecha válida.';
        } elseif ($dt < $hoy) {
            $campos['fecha'] = 'La fecha no puede ser pasada.';
        } elseif ($dt > (clone $hoy)->modify('+1 year')) {
            $campos['fecha'] = 'Elegí una fecha dentro del próximo año.';
        }
        $aplica = in_array($d['aplica'] ?? '', ['ambos', 'consulta', 'guardia'], true) ? $d['aplica'] : 'ambos';
        $cerrado = !empty($d['cerrado']);
        $abre = $cierra = null;
        if (!$cerrado) {
            $abre = $d['abre'] ?? null;
            $cierra = $d['cierra'] ?? null;
            if (!is_int($abre) || !is_int($cierra) || $abre < 0 || $cierra > 24 || $abre >= $cierra) {
                $campos['horas'] = 'La hora de cierre tiene que ser después de la de apertura.';
            }
        }
        $motivo = texto($d['motivo'] ?? '', 80) ?: 'Cambio de horario';
        if ($campos) {
            fallar('Revisá los datos marcados.', 422, $campos);
        }
        $pdo = db();
        $pdo->beginTransaction();
        // Un solo cambio por día y tipo de atención: el nuevo reemplaza al anterior
        $pdo->prepare("DELETE FROM excepciones WHERE vet_id = ? AND fecha = ? AND (aplica = 'ambos' OR ? = 'ambos' OR aplica = ?)")
            ->execute([$vetId, $fecha, $aplica, $aplica]);
        $pdo->prepare('INSERT INTO excepciones (vet_id, fecha, aplica, cerrado, abre, cierra, motivo) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$vetId, $fecha, $aplica, $cerrado ? 1 : 0, $abre, $cierra, $motivo]);
        $pdo->commit();
        mi_vet($vetId);

    case 'DELETE':
        verificar_origen();
        $id = (int)($_GET['id'] ?? 0);
        $st = db()->prepare('DELETE FROM excepciones WHERE id = ? AND vet_id = ?');
        $st->execute([$id, $vetId]);
        if ($st->rowCount() === 0) {
            fallar('No encontramos ese día especial.', 404);
        }
        mi_vet($vetId);

    default:
        fallar('Método no permitido.', 405);
}
