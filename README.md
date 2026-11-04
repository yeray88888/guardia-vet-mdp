# Guardia Vet MDP

Web para celular que conecta a dueños de mascotas con veterinarias de Mar del Plata: guardias de urgencia, turnos de consulta, fichas de mascotas y pedidos de donantes de sangre.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página: carga las librerías (React, Leaflet, Babel) y los archivos de `js/` en orden. |
| `css/estilos.css` | Todos los estilos: colores, modo oscuro, diseño para celular y el mapa. |
| `js/datos.js` | Constantes de la app y los hooks de React (`useState`, `useEffect`, `useRef`). |
| `js/utilidades.js` | Funciones de JavaScript puro: horarios, fechas, distancias, vacunas y reglas de contraseña. |
| `js/api.js` | Conexión con el servidor PHP: cada pedido y respuesta viaja en JSON. |
| `js/demo.js` | Modo demostración: datos de ejemplo si no se encuentra el servidor. |
| `js/componentes/comunes.js` | Componentes de React reutilizables: íconos, dibujos, encabezado, barra de abajo, campos. |
| `js/componentes/mapa.js` | Mapa con Leaflet (`useRef` + `useEffect`). |
| `js/componentes/mascotas.js` | Ficha, formulario y lista de mascotas. |
| `js/componentes/buscar.js` | Buscar veterinarias, avisar una urgencia y pedir turno. |
| `js/componentes/dueno.js` | Pantallas del dueño: turnos, mi cuenta y `AppDueno`. |
| `js/componentes/veterinaria.js` | Pantallas de la veterinaria: horarios, días especiales y `AppVet`. |
| `js/componentes/ingreso.js` | Bienvenida, ingresar, recuperar la cuenta y registrarse. |
| `js/app.js` | Componente principal `App`: decide qué pantalla mostrar y arranca React. Se carga último. |
| `database.sql` | Crea la base de datos `guardia_vet` y sus tablas. |
| `api/config.php` | Datos de conexión a MySQL y opciones de seguridad. |
| `api/helpers.php` | Funciones comunes: conexión, sesión segura, validaciones. |
| `api/registro.php` | Crear cuenta de dueño o de veterinaria. |
| `api/login.php` / `api/logout.php` / `api/sesion.php` | Entrar, salir y saber quién está logueado. Cada ingreso queda guardado. |
| `api/recuperar.php` | "¿Olvidaste tu contraseña?": manda un enlace de un solo uso que vence en 60 minutos. |
| `api/restablecer.php` | Guarda la contraseña nueva cuando la persona abre el enlace. |
| `api/olvide_email.php` | "¿Olvidaste tu email?": busca la cuenta por teléfono y muestra el email a medias. |
| `api/cambiar_pass.php` | Cambiar la contraseña desde "Mi cuenta". |
| `api/ingresos.php` | Últimos 5 ingresos de la cuenta (fecha, dispositivo e IP). |
| `api/correos/` | Donde quedan los correos de recuperación en modo de prueba. Bloqueada para el navegador. |
| `api/mascotas.php` | Ver, crear, editar y borrar las mascotas del dueño. |
| `api/horarios.php` | La veterinaria edita su horario semanal, sus días especiales y el estado de la guardia. |
| `api/veterinarias.php` | Lista pública de veterinarias con horarios. |
| `api/donantes.php` | Las veterinarias ven qué mascotas pueden donar sangre. |
| `api/instalar.php` | Carga datos de ejemplo (usar una sola vez). |

## Tecnologías

| Tecnología | Dónde se usa |
|---|---|
| **HTML** | `index.html`: estructura de la página y carga de librerías. |
| **CSS** | `css/estilos.css`: variables de color, modo oscuro, diseño responsive para celular. |
| **JavaScript** | `js/utilidades.js` y `js/api.js`: lógica de horarios, validaciones, distancias, conexión con la API. |
| **React** | `js/componentes/` y `js/app.js`: cada pantalla es un componente (`Buscar`, `Mascotas`, `FormMascota`, `AppVet`, `HorarioSemanal`…) con `useState`, `useEffect` y `useRef`. |
| **JSX** | Las pantallas se escriben con etiquetas dentro de JavaScript. Babel las traduce en el navegador. |
| **DOM** | React actualiza la página sin recargarla. Leaflet dibuja el mapa en un `div` que React le pasa con `useRef`. |
| **API propia (PHP + JSON)** | Carpeta `api`: registro, login, mascotas, horarios, veterinarias, donantes. |
| **API de mapas: Leaflet + OpenStreetMap** | Mapa real de Mar del Plata con un marcador por veterinaria (verde abierta, gris cerrada). |
| **API de geocodificación: Nominatim** | Al registrar una veterinaria, convierte la dirección en coordenadas para ubicarla en el mapa. |
| **API de geolocalización del navegador** | Botón "Usar mi ubicación": ordena las veterinarias por distancia a vos. |
| **Base de datos MySQL** | `database.sql`: usuarios, veterinarias, horarios, mascotas, alergias. |
| **Desarrollo seguro** | Ver la tabla de seguridad más abajo. |

## Cómo ponerlo a andar con XAMPP

1. Copiá la carpeta `guardia-vet` dentro de `C:\xampp\htdocs\`.
2. Abrí el panel de XAMPP y prendé **Apache** y **MySQL**.
3. Entrá a `http://localhost/phpmyadmin`, andá a la pestaña **Importar**, elegí `database.sql` y tocá **Continuar**.
4. Abrí `http://localhost/guardia-vet/api/instalar.php` una vez. Carga veterinarias, dueños y mascotas de ejemplo.
5. Abrí `http://localhost/guardia-vet/`. Abajo de la pantalla tiene que decir "Conectado al servidor".

Cuentas de ejemplo (contraseña `Demo1234!` en todas):
- Dueña: `dueno@ejemplo.com`
- Veterinaria: `vet@ejemplo.com` (Hospital Veterinario Constitución)

**Para verla en el celular:** con el celular en el mismo wifi que la computadora, abrí `http://IP-DE-LA-COMPU/guardia-vet/`. La IP aparece escribiendo `ipconfig` en la consola de Windows (dato "Dirección IPv4").

**Importante:** la página se abre siempre desde `http://localhost/...`, no con doble clic en el archivo. Babel tiene que descargar los archivos de `js/`, y el navegador no lo permite si la página se abre como archivo suelto.

Si XAMPP está prendido pero la base no responde, la web funciona en **modo demostración**: usa datos en memoria que se pierden al recargar.

El mapa necesita internet: las calles vienen de OpenStreetMap. "Usar mi ubicación" funciona en `localhost`. Desde el celular por IP, el navegador solo comparte la ubicación con HTTPS, así que en ese caso las distancias se calculan desde el centro.

## Recuperar la cuenta

**Si se olvida la contraseña**
1. En "Ingresar" se toca **¿Olvidaste tu contraseña?** y se escribe el email.
2. El servidor crea un código al azar de 64 caracteres. En la base guarda solo su hash (SHA-256), con vencimiento a los 60 minutos.
3. Se manda por correo un enlace `http://.../guardia-vet/?recuperar=CÓDIGO`.
4. Al abrir el enlace, la web pide la contraseña nueva, la guarda con `password_hash` y anula el enlace.
5. Se cierran todas las sesiones abiertas en otros dispositivos.

**Si se olvida el email:** en **¿Olvidaste tu email?** se escribe el teléfono y la web muestra el email a medias (`ma*****@gmail.com`).

**El correo:** en XAMPP normalmente no hay servidor de correo, por eso `config.php` viene con `correo_modo = 'archivo'`: cada correo se guarda como `.txt` en `api/correos`. Además, con `mostrar_enlace_demo = true` la web muestra el botón "Abrir el enlace" para poder probarlo en la presentación. En un sitio real se usa `correo_modo = 'mail'` con un servidor de correo, y `mostrar_enlace_demo = false`.

## Seguridad: qué hace y dónde

| Medida | Qué evita | Dónde |
|---|---|---|
| Contraseña con mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial; sin palabras comunes ni el propio email | Contraseñas fáciles de adivinar | `validar_pass()` en `helpers.php` (y la misma regla en `app.js` para avisar mientras se escribe) |
| `password_hash` y `password_verify` (bcrypt con sal aleatoria) | Que alguien lea las contraseñas si roba la base de datos | `registro.php`, `login.php` |
| Consultas preparadas con PDO | Inyección SQL | Todos los archivos (función `db()`) |
| Cookie de sesión HttpOnly + SameSite=Strict (+ Secure con HTTPS) | Robo de sesión por JavaScript y uso desde otros sitios | `helpers.php` |
| `session_regenerate_id` al entrar | Fijación de sesión | `helpers.php` → `iniciar_sesion_de()` |
| Cabecera obligatoria `X-GuardiaVet` en pedidos que cambian datos | Ataques CSRF desde otras páginas | `helpers.php` → `verificar_origen()` |
| Bloqueo de 15 minutos después de 5 intentos fallidos | Adivinar contraseñas por fuerza bruta | `login.php` |
| Mismo mensaje si falla el email o la contraseña, y mismo tiempo de respuesta | Averiguar qué emails están registrados | `login.php` |
| Roles (dueño / veterinaria) y filtros por dueño | Que alguien vea o cambie datos de otro | `requerir()`, `mascotas.php`, `horarios.php` |
| Validación de todos los datos en el servidor | Datos inválidos aunque se saltee la validación de la web | Cada archivo de la API |
| Los errores internos van al log y no se muestran | Mostrar detalles del servidor a un atacante | `helpers.php` |
| El instalador solo funciona desde localhost | Que alguien de afuera cargue datos | `instalar.php` |
| Enlace de recuperación al azar (`random_bytes`), guardado como hash, de un solo uso y con vencimiento | Que alguien adivine o reutilice un enlace, o lo use si roba la base | `recuperar.php`, `restablecer.php` |
| "¿Olvidaste tu contraseña?" responde lo mismo exista o no el email | Averiguar qué emails están registrados | `recuperar.php` |
| Máximo 3 enlaces por hora por cuenta y límite de pedidos por IP | Llenar de correos a alguien o probar teléfonos al azar | `recuperar.php`, `olvide_email.php`, `limitar_ip()` |
| El email recuperado se muestra a medias | Que cualquiera con un teléfono vea el email completo | `olvide_email.php` |
| Al cambiar la contraseña se cierran las sesiones viejas | Que alguien que tenía la sesión abierta siga adentro | `usuario_actual()` en `helpers.php` |
| Para cambiar la contraseña hay que escribir la actual | Que alguien con el celular desbloqueado la cambie | `cambiar_pass.php` |
| Historial de ingresos visible para el usuario | Detectar ingresos que la persona no reconoce | `ingresos.php`, tabla `ingresos` |
| `<meta name="referrer" content="strict-origin-when-cross-origin">` y el enlace se borra de la barra apenas se abre | Que el enlace de recuperación se filtre a otros sitios (solo se manda el nombre del sitio, que OpenStreetMap necesita) | `index.html` |
| Las veterinarias nuevas pueden quedar sin publicar hasta verificar la matrícula | Veterinarias falsas | `config.php` → `verificar_automatico` |
| La ubicación tiene que caer dentro de Mar del Plata | Marcadores en lugares falsos | `helpers.php` → `validar_ubicacion()` |

## Para un servidor real (no hace falta para la presentación)

- Usar HTTPS (la cookie pasa a ser `Secure` sola).
- Crear un usuario de MySQL propio con contraseña, en vez de `root`.
- Poner `verificar_automatico` en `false` y verificar matrículas a mano.
- Borrar `instalar.php`.
- En `config.php`: `correo_modo = 'mail'` y `mostrar_enlace_demo = false`.

## Lo que falta pasar al servidor

Los avisos de urgencia, los turnos y los pedidos de donantes todavía se guardan en el navegador. El siguiente paso es crear las tablas `avisos`, `turnos` y `pedidos_donacion` con sus archivos PHP, siguiendo el mismo modelo que `mascotas.php`.
