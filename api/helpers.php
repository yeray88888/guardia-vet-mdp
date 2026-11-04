<?php
// Funciones comunes. Cada archivo de la API empieza con: require __DIR__ . '/helpers.php';
declare(strict_types=1);

$CONFIG = require __DIR__ . '/config.php';

// Respuestas siempre en JSON y sin caché
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

// Los errores internos se guardan en el log de PHP y nunca se muestran al usuario
ini_set('display_errors', '0');
set_exception_handler(function (Throwable $e): void {
    error_log('[GuardiaVet] ' . $e);
    http_response_code(500);
    echo json_encode(['error' => 'Hubo un problema en el servidor. Probá de nuevo en un rato.'], JSON_UNESCAPED_UNICODE);
});

// ---------- Sesión segura ----------
// HttpOnly: JavaScript no puede leer la cookie. SameSite=Strict: otro sitio no puede usarla.
// Secure: si el sitio usa HTTPS, la cookie solo viaja cifrada.
$GV_HTTPS = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('GVSESION');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'secure' => $GV_HTTPS, 'httponly' => true, 'samesite' => 'Strict',
]);
session_start();

const SERVICIOS = ['Control general', 'Vacunación', 'Desparasitación', 'Castración', 'Peluquería', 'Análisis y estudios', 'Atención a domicilio', 'Cirugía'];
const URGENCIAS = ['Intoxicación', 'Golpe o fractura', 'Dificultad para respirar', 'Parto', 'Herida o sangrado', 'Vómitos o diarrea'];
const ESPECIES  = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro'];
const DIAS      = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// Hash de relleno: si el email no existe igual se verifica una contraseña, así la respuesta tarda lo mismo
// y nadie puede averiguar qué emails están registrados midiendo el tiempo.
const HASH_FALSO = '$2y$10$8CsE2M.Wq3oxOYkzOI.X/.N84aq15nwWdeDv9zjfSRDARzojHRYFa';

function db(): PDO
{
    static $pdo = null;
    global $CONFIG;
    if ($pdo === null) {
        // Consultas preparadas reales: los datos nunca se mezclan con el SQL (evita inyección SQL)
        $pdo = new PDO($CONFIG['db_dsn'], $CONFIG['db_user'], $CONFIG['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        if (str_starts_with($CONFIG['db_dsn'], 'sqlite')) {
            $pdo->exec('PRAGMA foreign_keys = ON');
        }
    }
    return $pdo;
}

function responder(array $datos, int $codigo = 200): never
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar(string $mensaje, int $codigo = 400, array $campos = []): never
{
    responder($campos ? ['error' => $mensaje, 'campos' => $campos] : ['error' => $mensaje], $codigo);
}

function metodo(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

// Protección CSRF: todo pedido que cambia datos tiene que traer la cabecera propia de la app.
// Un formulario o link de otro sitio no puede agregar cabeceras, así que queda bloqueado.
function verificar_origen(): void
{
    if (($_SERVER['HTTP_X_GUARDIAVET'] ?? '') !== '1') {
        fallar('Pedido no permitido.', 403);
    }
}

function cuerpo(): array
{
    verificar_origen();
    $datos = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($datos)) {
        fallar('Los datos tienen que llegar en formato JSON.');
    }
    return $datos;
}

function texto(mixed $valor, int $max): string
{
    return is_scalar($valor) ? mb_substr(trim((string)$valor), 0, $max) : '';
}

function ahora_sql(): string
{
    return date('Y-m-d H:i:s');
}

function usuario_actual(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $st = db()->prepare('SELECT id, email, rol, nombre, telefono, barrio, pass_cambiada FROM usuarios WHERE id = ?');
    $st->execute([$_SESSION['uid']]);
    $u = $st->fetch();
    if (!$u) {
        return null;
    }
    // Si la contraseña se cambió después de iniciar esta sesión, la sesión deja de valer
    if ($u['pass_cambiada'] !== null && strtotime($u['pass_cambiada']) > ($_SESSION['inicio'] ?? 0)) {
        $_SESSION = [];
        session_destroy();
        return null;
    }
    unset($u['pass_cambiada']);
    return $u;
}

// Corta el pedido si no hay sesión o si el rol no corresponde
function requerir(?string $rol = null): array
{
    $u = usuario_actual();
    if (!$u) {
        fallar('Tenés que iniciar sesión.', 401);
    }
    if ($rol !== null && $u['rol'] !== $rol) {
        fallar('Tu cuenta no tiene permiso para esto.', 403);
    }
    return $u;
}

function vet_id_de(int $usuarioId): int
{
    $st = db()->prepare('SELECT id FROM veterinarias WHERE usuario_id = ?');
    $st->execute([$usuarioId]);
    $id = $st->fetchColumn();
    if ($id === false) {
        fallar('No encontramos la veterinaria de esta cuenta.', 404);
    }
    return (int)$id;
}

function iniciar_sesion_de(int $usuarioId): void
{
    session_regenerate_id(true); // ID de sesión nuevo al entrar: evita la fijación de sesión
    $_SESSION['uid'] = $usuarioId;
    $_SESSION['inicio'] = time();
}

function digitos(string $texto): string
{
    return preg_replace('/\D/', '', $texto);
}

// Reglas de contraseña. Devuelve el error, o '' si está bien.
// Reglas de contraseña: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
// Devuelve el error, o '' si está bien. $email sirve para que la contraseña no contenga el propio email.
function validar_pass(mixed $pass, string $email = ''): string
{
    if (!is_string($pass) || !mb_check_encoding($pass, 'UTF-8')) {
        return 'Escribí una contraseña válida.';
    }
    if (mb_strlen($pass) < 8) {
        return 'Tiene que tener al menos 8 caracteres.';
    }
    if (strlen($pass) > 72) { // bcrypt solo usa los primeros 72 bytes
        return 'Es demasiado larga: puede tener hasta 72 caracteres.';
    }
    $falta = [];
    if (!preg_match('/\p{Lu}/u', $pass)) {
        $falta[] = 'una mayúscula';
    }
    if (!preg_match('/\p{Ll}/u', $pass)) {
        $falta[] = 'una minúscula';
    }
    if (!preg_match('/\d/', $pass)) {
        $falta[] = 'un número';
    }
    if (!preg_match('/[^\p{L}\p{N}\s]/u', $pass)) {
        $falta[] = 'un carácter especial (como ! ? # $ % & * .)';
    }
    if ($falta) {
        $ultimo = array_pop($falta);
        return 'Le falta ' . ($falta ? implode(', ', $falta) . ' y ' : '') . $ultimo . '.';
    }
    if (preg_match('/^\s|\s$/u', $pass)) {
        return 'No puede empezar ni terminar con un espacio.';
    }
    // Contraseñas muy comunes que cumplen las reglas pero se adivinan fácil
    $minus = mb_strtolower($pass);
    foreach (['password', 'contraseña', 'contrasena', 'qwerty', '12345678', 'abc123', 'guardiavet'] as $comun) {
        if (str_contains($minus, $comun)) {
            return 'Es muy fácil de adivinar: no uses "' . $comun . '".';
        }
    }
    $usuario = mb_strtolower(explode('@', $email)[0]);
    if (mb_strlen($usuario) >= 4 && str_contains($minus, $usuario)) {
        return 'No puede contener tu email.';
    }
    return '';
}

// Guarda cada ingreso exitoso (fecha, IP y navegador)
function registrar_ingreso(int $usuarioId): void
{
    db()->prepare('INSERT INTO ingresos (usuario_id, fecha, ip, navegador) VALUES (?, ?, ?, ?)')
        ->execute([$usuarioId, ahora_sql(), $_SERVER['REMOTE_ADDR'] ?? '', mb_substr($_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido', 0, 200)]);
}

// "martina@gmail.com" → "ma******@gmail.com"
function enmascarar_email(string $email): string
{
    [$usuario, $dominio] = array_pad(explode('@', $email, 2), 2, '');
    return mb_substr($usuario, 0, 2) . str_repeat('*', max(3, mb_strlen($usuario) - 2)) . '@' . $dominio;
}

// Límite de pedidos por IP (recuperar contraseña, buscar email...)
function limitar_ip(string $tipo, int $maximo, int $minutos): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $st = db()->prepare('SELECT COUNT(*) FROM intentos_recuperar WHERE ip = ? AND tipo = ? AND fecha > ?');
    $st->execute([$ip, $tipo, date('Y-m-d H:i:s', time() - $minutos * 60)]);
    if ((int)$st->fetchColumn() >= $maximo) {
        fallar('Hiciste muchos pedidos seguidos. Esperá ' . $minutos . ' minutos y probá de nuevo.', 429);
    }
    db()->prepare('INSERT INTO intentos_recuperar (ip, tipo, fecha) VALUES (?, ?, ?)')->execute([$ip, $tipo, ahora_sql()]);
}

function enviar_correo(string $para, string $asunto, string $texto): void
{
    global $CONFIG;
    if ($CONFIG['correo_modo'] === 'mail') {
        $cabeceras = 'From: ' . $CONFIG['correo_remitente'] . "\r\nContent-Type: text/plain; charset=utf-8";
        @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $texto, $cabeceras);
        return;
    }
    // Modo archivo: el correo queda en api/correos (la carpeta está bloqueada para el navegador)
    $carpeta = __DIR__ . '/correos';
    if (!is_dir($carpeta)) {
        mkdir($carpeta, 0700, true);
    }
    file_put_contents($carpeta . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.txt', "Para: $para\nAsunto: $asunto\n\n$texto");
}

function url_sitio(): string
{
    global $CONFIG, $GV_HTTPS;
    if ($CONFIG['url_sitio'] !== '') {
        return rtrim($CONFIG['url_sitio'], '/');
    }
    $carpeta = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
    return ($GV_HTTPS ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $carpeta;
}

// ---------- Horarios ----------
// Formato: 7 días (0 = domingo). Cada día: {"consulta": [[9,13],[16,20]], "guardia": [[0,24]]}
function validar_horario(mixed $h): array
{
    if (!is_array($h) || count($h) !== 7) {
        fallar('El horario tiene que tener los 7 días.', 422);
    }
    $salida = [];
    foreach (array_values($h) as $i => $dia) {
        $fila = ['consulta' => [], 'guardia' => []];
        foreach (['consulta', 'guardia'] as $tipo) {
            $franjas = (is_array($dia) && isset($dia[$tipo]) && is_array($dia[$tipo])) ? $dia[$tipo] : [];
            if (count($franjas) > 4) {
                fallar('Puede haber hasta 4 franjas por día.', 422);
            }
            foreach ($franjas as $f) {
                if (!is_array($f) || count($f) !== 2 || !is_int($f[0] ?? null) || !is_int($f[1] ?? null)) {
                    fallar('Hay una franja horaria con un formato inválido.', 422);
                }
                [$a, $b] = $f;
                if ($a < 0 || $b > 24 || $a >= $b) {
                    fallar('El ' . DIAS[$i] . ' hay una franja donde el cierre no es después de la apertura.', 422);
                }
                $fila[$tipo][] = [$a, $b];
            }
            usort($fila[$tipo], fn($x, $y) => $x[0] <=> $y[0]);
            for ($k = 1; $k < count($fila[$tipo]); $k++) {
                if ($fila[$tipo][$k][0] < $fila[$tipo][$k - 1][1]) {
                    fallar('El ' . DIAS[$i] . ' hay franjas que se superponen.', 422);
                }
            }
        }
        $salida[] = $fila;
    }
    return $salida;
}

// La ubicación tiene que caer dentro del partido de General Pueyrredon (Mar del Plata)
function validar_ubicacion(mixed $lat, mixed $lng): array
{
    if (!is_numeric($lat) || !is_numeric($lng)) {
        fallar('Marcá en el mapa dónde está la veterinaria.', 422, ['ubicacion' => 'Marcá en el mapa dónde está la veterinaria.']);
    }
    $lat = round((float)$lat, 6);
    $lng = round((float)$lng, 6);
    if ($lat < -38.40 || $lat > -37.65 || $lng < -57.95 || $lng > -57.35) {
        fallar('La ubicación tiene que estar en Mar del Plata.', 422, ['ubicacion' => 'La ubicación tiene que estar en Mar del Plata.']);
    }
    return [$lat, $lng];
}

function guardar_horario(int $vetId, array $horario): void
{
    db()->prepare('DELETE FROM horarios WHERE vet_id = ?')->execute([$vetId]);
    $st = db()->prepare('INSERT INTO horarios (vet_id, tipo, dia, abre, cierra) VALUES (?, ?, ?, ?, ?)');
    foreach ($horario as $dia => $fila) {
        foreach (['consulta', 'guardia'] as $tipo) {
            foreach ($fila[$tipo] as [$a, $b]) {
                $st->execute([$vetId, $tipo, $dia, $a, $b]);
            }
        }
    }
}

// Devuelve las veterinarias con el formato que usa la web
function cargar_vets(?int $soloId = null): array
{
    $sql = 'SELECT * FROM veterinarias';
    $params = [];
    if ($soloId !== null) {
        $sql .= ' WHERE id = ?';
        $params[] = $soloId;
    } else {
        $sql .= ' WHERE verificada = 1';
    }
    $st = db()->prepare($sql . ' ORDER BY id');
    $st->execute($params);
    $vets = [];
    $hoy = date('Y-m-d');
    foreach ($st->fetchAll() as $v) {
        $id = (int)$v['id'];
        $serv = db()->prepare('SELECT servicio FROM vet_servicios WHERE vet_id = ?');
        $serv->execute([$id]);
        $urg = db()->prepare('SELECT urgencia FROM vet_urgencias WHERE vet_id = ?');
        $urg->execute([$id]);
        $horario = array_fill(0, 7, ['consulta' => [], 'guardia' => []]);
        $hs = db()->prepare('SELECT tipo, dia, abre, cierra FROM horarios WHERE vet_id = ? ORDER BY dia, abre');
        $hs->execute([$id]);
        foreach ($hs->fetchAll() as $h) {
            $horario[(int)$h['dia']][$h['tipo']][] = [(int)$h['abre'], (int)$h['cierra']];
        }
        $ex = db()->prepare('SELECT id, fecha, aplica, cerrado, abre, cierra, motivo FROM excepciones WHERE vet_id = ? AND fecha >= ? ORDER BY fecha');
        $ex->execute([$id, $hoy]);
        $excepciones = array_map(fn($e) => [
            'id'      => (int)$e['id'],
            'fecha'   => (string)$e['fecha'],
            'aplica'  => $e['aplica'],
            'cerrado' => (bool)$e['cerrado'],
            'abre'    => $e['abre'] === null ? null : (int)$e['abre'],
            'cierra'  => $e['cierra'] === null ? null : (int)$e['cierra'],
            'motivo'  => $e['motivo'],
        ], $ex->fetchAll());
        $vets[] = [
            'id'          => $id,
            'nombre'      => $v['nombre'],
            'barrio'      => $v['barrio'],
            'direccion'   => $v['direccion'],
            'tel'         => $v['telefono'],
            'lat'         => (float)$v['lat'],
            'lng'         => (float)$v['lng'],
            'verificada'  => (bool)$v['verificada'],
            'abierta'     => (bool)$v['guardia_abierta'],
            'espera'      => (int)$v['espera_min'],
            'servicios'   => array_values(array_intersect(SERVICIOS, $serv->fetchAll(PDO::FETCH_COLUMN))),
            'puede'       => array_values(array_intersect(URGENCIAS, $urg->fetchAll(PDO::FETCH_COLUMN))),
            'horario'     => $horario,
            'excepciones' => $excepciones,
        ];
    }
    return $vets;
}

// ---------- Mascotas ----------
function mascota_a_json(array $m, array $alergias): array
{
    $peso = '';
    if ($m['peso'] !== null) {
        $peso = rtrim(rtrim(number_format((float)$m['peso'], 2, '.', ''), '0'), '.');
    }
    return [
        'id'            => (string)$m['id'],
        'nombre'        => $m['nombre'],
        'especie'       => $m['especie'],
        'raza'          => $m['raza'],
        'sexo'          => $m['sexo'],
        'nacimiento'    => $m['nacimiento'],
        'peso'          => $peso,
        'castrado'      => (bool)$m['castrado'],
        'color'         => $m['color'],
        'alergias'      => $alergias,
        'condiciones'   => $m['condiciones'],
        'medicacion'    => $m['medicacion'],
        'antirrabica'   => $m['antirrabica'] ?? '',
        'vacunaGeneral' => $m['vacuna_general'] ?? '',
        'chip'          => $m['chip'] ?? '',
        'donante'       => (bool)$m['donante'],
        'notas'         => $m['notas'],
    ];
}

function listar_mascotas(int $duenoId, ?int $soloId = null): array
{
    $sql = 'SELECT * FROM mascotas WHERE dueno_id = ?';
    $params = [$duenoId];
    if ($soloId !== null) {
        $sql .= ' AND id = ?';
        $params[] = $soloId;
    }
    $st = db()->prepare($sql . ' ORDER BY id');
    $st->execute($params);
    $al = db()->prepare('SELECT nombre FROM alergias WHERE mascota_id = ? ORDER BY id');
    $salida = [];
    foreach ($st->fetchAll() as $m) {
        $al->execute([$m['id']]);
        $salida[] = mascota_a_json($m, $al->fetchAll(PDO::FETCH_COLUMN));
    }
    return $salida;
}

// Lo que la web necesita saber del usuario logueado (nunca incluye el hash de la contraseña)
function datos_usuario(int $id): array
{
    $st = db()->prepare('SELECT id, email, rol, nombre, telefono, barrio FROM usuarios WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    $salida = [
        'id' => (string)$u['id'], 'rol' => $u['rol'], 'nombre' => $u['nombre'],
        'email' => $u['email'], 'tel' => $u['telefono'], 'barrio' => $u['barrio'],
    ];
    if ($u['rol'] === 'dueno') {
        $salida['mascotas'] = listar_mascotas($id);
    } elseif ($u['rol'] === 'vet') {
        $v = db()->prepare('SELECT id, matricula FROM veterinarias WHERE usuario_id = ?');
        $v->execute([$id]);
        $fila = $v->fetch();
        $salida['matricula'] = $fila['matricula'];
        $salida['vetId'] = (int)$fila['id'];
    }
    return $salida;
}
