<?php
// GET /api/sesion.php  → el usuario logueado, o null
require __DIR__ . '/helpers.php';

$u = usuario_actual();
responder(['usuario' => $u ? datos_usuario((int)$u['id']) : null]);
