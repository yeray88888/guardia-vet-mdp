-- Guardia Vet MDP · base de datos (MySQL / MariaDB de XAMPP)
-- Importar desde phpMyAdmin: pestaña "Importar" y elegir este archivo.

CREATE DATABASE IF NOT EXISTS guardia_vet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE guardia_vet;

-- Cuentas de dueños y veterinarias. La contraseña NUNCA se guarda: solo su hash (bcrypt).
CREATE TABLE usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL UNIQUE,
  pass_hash  VARCHAR(255) NOT NULL,
  rol        ENUM('dueno','vet','admin') NOT NULL,
  nombre     VARCHAR(120) NOT NULL,
  telefono   VARCHAR(30)  NOT NULL,
  telefono_digitos VARCHAR(20) NOT NULL DEFAULT '',   -- solo números, para "¿Olvidaste tu email?"
  barrio     VARCHAR(60)  NOT NULL,
  pass_cambiada DATETIME  NULL,                       -- al cambiar la contraseña se cierran las sesiones viejas
  creado     DATETIME     NOT NULL,
  INDEX (telefono_digitos)
) ENGINE=InnoDB;

CREATE TABLE veterinarias (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NOT NULL UNIQUE,
  nombre          VARCHAR(120) NOT NULL,
  matricula       VARCHAR(20)  NOT NULL,
  direccion       VARCHAR(160) NOT NULL,
  barrio          VARCHAR(60)  NOT NULL,
  telefono        VARCHAR(30)  NOT NULL,
  lat             DECIMAL(9,6) NOT NULL,          -- ubicación para el mapa (Leaflet)
  lng             DECIMAL(9,6) NOT NULL,
  verificada      TINYINT(1)   NOT NULL DEFAULT 0,
  guardia_abierta TINYINT(1)   NOT NULL DEFAULT 1,
  espera_min      SMALLINT     NOT NULL DEFAULT 15,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vet_servicios (
  vet_id   INT NOT NULL,
  servicio VARCHAR(40) NOT NULL,
  PRIMARY KEY (vet_id, servicio),
  FOREIGN KEY (vet_id) REFERENCES veterinarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vet_urgencias (
  vet_id   INT NOT NULL,
  urgencia VARCHAR(40) NOT NULL,
  PRIMARY KEY (vet_id, urgencia),
  FOREIGN KEY (vet_id) REFERENCES veterinarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Horario semanal. dia: 0 = domingo ... 6 = sábado. Horas enteras de 0 a 24.
CREATE TABLE horarios (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  vet_id INT NOT NULL,
  tipo   ENUM('consulta','guardia') NOT NULL,
  dia    TINYINT NOT NULL,
  abre   TINYINT NOT NULL,
  cierra TINYINT NOT NULL,
  INDEX (vet_id),
  FOREIGN KEY (vet_id) REFERENCES veterinarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Días especiales: feriados, vacaciones, "hoy no atendemos", horarios distintos.
CREATE TABLE excepciones (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  vet_id  INT NOT NULL,
  fecha   DATE NOT NULL,
  aplica  ENUM('ambos','consulta','guardia') NOT NULL,
  cerrado TINYINT(1) NOT NULL,
  abre    TINYINT NULL,
  cierra  TINYINT NULL,
  motivo  VARCHAR(80) NOT NULL,
  INDEX (vet_id, fecha),
  FOREIGN KEY (vet_id) REFERENCES veterinarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE mascotas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  dueno_id       INT NOT NULL,
  nombre         VARCHAR(40)  NOT NULL,
  especie        VARCHAR(20)  NOT NULL,
  raza           VARCHAR(60)  NOT NULL,
  sexo           ENUM('Macho','Hembra') NOT NULL,
  nacimiento     CHAR(7)      NOT NULL,          -- AAAA-MM
  peso           DECIMAL(6,2) NULL,
  castrado       TINYINT(1)   NOT NULL DEFAULT 0,
  color          VARCHAR(120) NOT NULL DEFAULT '',
  condiciones    VARCHAR(200) NOT NULL DEFAULT '',
  medicacion     VARCHAR(200) NOT NULL DEFAULT '',
  antirrabica    CHAR(7)      NULL,              -- AAAA-MM de la última dosis
  vacuna_general CHAR(7)      NULL,
  chip           CHAR(15)     NULL,
  donante        TINYINT(1)   NOT NULL DEFAULT 0,
  notas          VARCHAR(300) NOT NULL DEFAULT '',
  creado         DATETIME     NOT NULL,
  INDEX (dueno_id),
  FOREIGN KEY (dueno_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE alergias (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  mascota_id INT NOT NULL,
  nombre     VARCHAR(60) NOT NULL,
  FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Intentos fallidos de login, para frenar ataques de fuerza bruta.
CREATE TABLE intentos_login (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  ip    VARCHAR(45)  NOT NULL,
  fecha DATETIME     NOT NULL,
  INDEX (email, fecha),
  INDEX (ip, fecha)
) ENGINE=InnoDB;

-- Enlaces para recuperar la contraseña. Se guarda el hash del enlace, nunca el enlace en sí.
-- Cada enlace vence a los 60 minutos y se puede usar una sola vez.
CREATE TABLE recuperaciones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira     DATETIME NOT NULL,
  usado      TINYINT(1) NOT NULL DEFAULT 0,
  creado     DATETIME NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  INDEX (usuario_id, creado),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Historial de ingresos de cada cuenta (el usuario lo ve en "Mi cuenta")
CREATE TABLE ingresos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha      DATETIME NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  navegador  VARCHAR(200) NOT NULL,
  INDEX (usuario_id, fecha),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pedidos de recuperación por IP, para frenar abusos
CREATE TABLE intentos_recuperar (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  ip    VARCHAR(45) NOT NULL,
  tipo  VARCHAR(20) NOT NULL,
  fecha DATETIME    NOT NULL,
  INDEX (ip, tipo, fecha)
) ENGINE=InnoDB;
