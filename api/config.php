<?php
// Configuración del servidor. En XAMPP, MySQL viene con usuario "root" y sin contraseña.
// En un servidor real: usar un usuario de MySQL propio con contraseña y solo los permisos necesarios.
date_default_timezone_set('America/Argentina/Buenos_Aires');

return [
    'db_dsn'  => getenv('GV_DSN')  ?: 'mysql:host=localhost;dbname=guardia_vet;charset=utf8mb4',
    'db_user' => getenv('GV_USER') ?: 'root',
    'db_pass' => getenv('GV_PASS') ?: '',

    // Login: después de 5 intentos fallidos con el mismo email, se bloquea 15 minutos.
    'max_intentos' => 5,
    'bloqueo_min'  => 15,

    // true = las veterinarias nuevas aparecen enseguida (cómodo para la presentación).
    // false = un administrador tiene que verificar la matrícula antes (lo correcto en producción).
    'verificar_automatico' => true,

    // ---- Recuperación de contraseña ----
    // 'archivo': el correo se guarda como .txt en api/correos (sirve para probar sin servidor de correo).
    // 'mail': se envía con la función mail() de PHP (hay que configurar el correo en XAMPP o en el hosting).
    'correo_modo' => 'archivo',
    'correo_remitente' => 'Guardia Vet MDP <no-responder@guardiavet.local>',
    // true = la respuesta incluye el enlace para poder probarlo en la presentación. En un sitio real: false.
    'mostrar_enlace_demo' => true,
    // Dirección pública del sitio, por ejemplo https://guardiavet.com.ar. Vacío = se arma sola.
    'url_sitio' => '',
    'recuperar_minutos' => 60,
];
