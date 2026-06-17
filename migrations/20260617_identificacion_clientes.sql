-- ============================================================
-- VetCitas - Base completa MySQL
-- Version: clientes con identificacion, multiples mascotas,
-- agenda centralizada y cancelacion de citas.
-- ============================================================
-- ADVERTENCIA: este script borra y recrea toda la base vetcitas.
-- Ejecutar:
--   mysql -u usuario -p < migrations/20260617_identificacion_clientes.sql
-- ============================================================

DROP DATABASE IF EXISTS vetcitas;

CREATE DATABASE vetcitas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vetcitas;

CREATE TABLE clientes (
  id_cliente       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  identificacion   VARCHAR(30)  NOT NULL,
  nombres          VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  telefono         VARCHAR(20)  NOT NULL,
  email            VARCHAR(150) NOT NULL,
  direccion        VARCHAR(255) NULL,
  fecha_registro   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_clientes_identificacion (identificacion),
  KEY idx_clientes_telefono (telefono),
  KEY idx_clientes_email (email)
) ENGINE=InnoDB;

CREATE TABLE mascotas (
  id_mascota     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cliente     INT UNSIGNED NOT NULL,
  nombre         VARCHAR(80)  NOT NULL,
  especie        ENUM('Perro','Gato','Ave','Conejo','Reptil','Otro') NOT NULL,
  raza           VARCHAR(80)  NULL,
  fecha_nac      DATE         NULL,
  observaciones  TEXT         NULL,
  PRIMARY KEY (id_mascota),
  UNIQUE KEY uq_mascota_cliente_nombre (id_cliente, nombre),
  KEY idx_mascotas_nombre (nombre),
  CONSTRAINT fk_mascota_cliente
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE veterinarios (
  id_veterinario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombres        VARCHAR(100) NOT NULL,
  apellidos      VARCHAR(100) NOT NULL,
  especialidad   VARCHAR(100) NULL,
  telefono       VARCHAR(20)  NULL,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_veterinario)
) ENGINE=InnoDB;

CREATE TABLE citas (
  id_cita        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_mascota     INT UNSIGNED NOT NULL,
  id_cliente     INT UNSIGNED NOT NULL,
  id_veterinario INT UNSIGNED NULL,
  tipo_caso      ENUM('Emergencia','Consulta general','Vacunacion') NOT NULL,
  prioridad      ENUM('Alta','Media','Baja') NOT NULL,
  fecha_cita     DATE NOT NULL,
  hora_cita      TIME NOT NULL,
  estado         ENUM('Pendiente','Confirmada','En atencion','Finalizada','Cancelada')
                 NOT NULL DEFAULT 'Pendiente',
  accion_dmn     VARCHAR(200) NULL,
  observaciones  TEXT NULL,
  notificado     TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cita),
  UNIQUE KEY uq_horario_vet (id_veterinario, fecha_cita, hora_cita),
  KEY idx_citas_fecha (fecha_cita),
  KEY idx_citas_estado (estado),
  KEY idx_citas_prioridad (prioridad),
  CONSTRAINT fk_cita_mascota
    FOREIGN KEY (id_mascota) REFERENCES mascotas(id_mascota)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_cliente
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_veterinario
    FOREIGN KEY (id_veterinario) REFERENCES veterinarios(id_veterinario)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE historial_cambios (
  id_historial    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cita         INT UNSIGNED NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo    VARCHAR(30) NOT NULL,
  cambiado_por    VARCHAR(100) NULL,
  fecha_cambio    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_historial),
  CONSTRAINT fk_hist_cita
    FOREIGN KEY (id_cita) REFERENCES citas(id_cita)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notificaciones (
  id_notificacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_cita         INT UNSIGNED NULL,
  canal           ENUM('Email','WhatsApp','Llamada') NOT NULL,
  destinatario    VARCHAR(150) NOT NULL,
  mensaje         TEXT NOT NULL,
  estado          ENUM('Pendiente','Enviada','Error') NOT NULL DEFAULT 'Pendiente',
  fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_envio     DATETIME NULL,
  PRIMARY KEY (id_notificacion),
  CONSTRAINT fk_notif_cita
    FOREIGN KEY (id_cita) REFERENCES citas(id_cita)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO clientes (identificacion, nombres, apellidos, telefono, email, direccion) VALUES
  ('1001', 'Laura',    'Martinez',  '3101112233', 'laura@email.com',  'Ibague'),
  ('1002', 'Carlos',   'Gomez',     '3204445566', 'cgomez@email.com', 'Ibague'),
  ('1003', 'Ana',      'Perez',     '3117778899', 'ana@email.com',    'Ibague'),
  ('1004', 'Jhonatan', 'Contreras', '3009998877', 'jhon@email.com',   'Ibague'),
  ('1005', 'Julian',   'Barrera',   '3165556644', 'julian@email.com', 'Ibague');

INSERT INTO veterinarios (nombres, apellidos, especialidad, telefono) VALUES
  ('Pedro', 'Ramirez', 'Medicina general', '3001002000'),
  ('Sofia', 'Lopez', 'Cirugia veterinaria', '3002003000');

INSERT INTO mascotas (id_cliente, nombre, especie, raza, observaciones) VALUES
  (1, 'Rex', 'Perro', 'Pastor Aleman', 'Vomitos frecuentes'),
  (1, 'Luna', 'Gato', 'Criolla', 'Mascota adicional del cliente'),
  (2, 'Michi', 'Gato', 'Siames', NULL),
  (3, 'Coco', 'Ave', 'Loro Amazona', 'Revision anual'),
  (4, 'Bolt', 'Perro', 'Labrador', NULL),
  (5, 'Nina', 'Conejo', 'Enano holandes', NULL);

INSERT INTO citas
  (id_mascota, id_cliente, id_veterinario, tipo_caso, prioridad, fecha_cita, hora_cita, estado, accion_dmn, observaciones, notificado)
VALUES
  (1, 1, 1, 'Emergencia', 'Alta', '2026-06-17', '08:00:00', 'Confirmada', 'Confirmar cita', NULL, 1),
  (3, 2, 1, 'Vacunacion', 'Baja', '2026-06-17', '09:00:00', 'Pendiente', 'Confirmar cita', NULL, 0),
  (4, 3, 2, 'Consulta general', 'Media', '2026-06-18', '11:00:00', 'Confirmada', 'Confirmar cita', 'Revision anual', 1),
  (5, 4, 1, 'Consulta general', 'Media', '2026-06-19', '14:00:00', 'Pendiente', 'Confirmar cita', NULL, 0),
  (6, 5, 2, 'Vacunacion', 'Baja', '2026-06-20', '16:00:00', 'Confirmada', 'Confirmar cita', NULL, 1);

CREATE OR REPLACE VIEW v_citas_detalle AS
SELECT
  c.id_cita,
  cl.identificacion,
  CONCAT(cl.nombres, ' ', cl.apellidos) AS dueno,
  cl.telefono,
  cl.email,
  m.nombre AS mascota,
  m.especie,
  CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
  c.tipo_caso,
  c.prioridad,
  c.fecha_cita,
  c.hora_cita,
  c.estado,
  c.accion_dmn,
  c.notificado,
  c.observaciones
FROM citas c
JOIN clientes cl ON c.id_cliente = cl.id_cliente
JOIN mascotas m ON c.id_mascota = m.id_mascota
LEFT JOIN veterinarios v ON c.id_veterinario = v.id_veterinario;

CREATE OR REPLACE VIEW v_clientes_mascotas AS
SELECT
  cl.id_cliente,
  cl.identificacion,
  cl.nombres,
  cl.apellidos,
  cl.telefono,
  cl.email,
  cl.direccion,
  m.id_mascota,
  m.nombre AS mascota,
  m.especie,
  m.raza,
  m.observaciones
FROM clientes cl
LEFT JOIN mascotas m ON m.id_cliente = cl.id_cliente
WHERE cl.activo = 1;

CREATE OR REPLACE VIEW v_citas_hoy AS
SELECT *
FROM v_citas_detalle
WHERE fecha_cita = CURDATE();

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_registrar_cliente_mascotas$$
CREATE PROCEDURE sp_registrar_cliente_mascotas(
  IN p_identificacion VARCHAR(30),
  IN p_nombres VARCHAR(100),
  IN p_apellidos VARCHAR(100),
  IN p_telefono VARCHAR(20),
  IN p_email VARCHAR(150),
  IN p_direccion VARCHAR(255),
  IN p_mascotas_json JSON
)
BEGIN
  DECLARE v_id_cliente INT UNSIGNED;
  DECLARE v_i INT DEFAULT 0;
  DECLARE v_total INT DEFAULT 0;
  DECLARE v_nombre VARCHAR(80);
  DECLARE v_especie VARCHAR(20);
  DECLARE v_raza VARCHAR(80);
  DECLARE v_observaciones TEXT;

  INSERT INTO clientes (identificacion, nombres, apellidos, telefono, email, direccion)
  VALUES (p_identificacion, p_nombres, p_apellidos, p_telefono, p_email, NULLIF(p_direccion, ''))
  ON DUPLICATE KEY UPDATE
    nombres = VALUES(nombres),
    apellidos = VALUES(apellidos),
    telefono = VALUES(telefono),
    email = VALUES(email),
    direccion = VALUES(direccion),
    activo = 1;

  SELECT id_cliente INTO v_id_cliente
  FROM clientes
  WHERE identificacion = p_identificacion
  LIMIT 1;

  SET v_total = JSON_LENGTH(p_mascotas_json);

  WHILE v_i < v_total DO
    SET v_nombre = JSON_UNQUOTE(JSON_EXTRACT(p_mascotas_json, CONCAT('$[', v_i, '].nombre')));
    SET v_especie = JSON_UNQUOTE(JSON_EXTRACT(p_mascotas_json, CONCAT('$[', v_i, '].especie')));
    SET v_raza = JSON_UNQUOTE(JSON_EXTRACT(p_mascotas_json, CONCAT('$[', v_i, '].raza')));
    SET v_observaciones = JSON_UNQUOTE(JSON_EXTRACT(p_mascotas_json, CONCAT('$[', v_i, '].observaciones')));

    IF v_nombre IS NOT NULL AND v_nombre <> '' AND v_especie IS NOT NULL AND v_especie <> '' THEN
      INSERT INTO mascotas (id_cliente, nombre, especie, raza, observaciones)
      VALUES (v_id_cliente, v_nombre, v_especie, NULLIF(v_raza, ''), NULLIF(v_observaciones, ''))
      ON DUPLICATE KEY UPDATE
        especie = VALUES(especie),
        raza = VALUES(raza),
        observaciones = VALUES(observaciones);
    END IF;

    SET v_i = v_i + 1;
  END WHILE;

  SELECT v_id_cliente AS id_cliente, p_identificacion AS identificacion;
END$$

DROP PROCEDURE IF EXISTS sp_agendar_cita_identificacion$$
CREATE PROCEDURE sp_agendar_cita_identificacion(
  IN p_identificacion VARCHAR(30),
  IN p_mascota VARCHAR(80),
  IN p_especie VARCHAR(20),
  IN p_id_veterinario INT UNSIGNED,
  IN p_tipo_caso VARCHAR(30),
  IN p_fecha DATE,
  IN p_hora TIME,
  IN p_observaciones TEXT
)
BEGIN
  DECLARE v_id_cliente INT UNSIGNED DEFAULT NULL;
  DECLARE v_id_mascota INT UNSIGNED DEFAULT NULL;
  DECLARE v_ocupado INT DEFAULT 0;
  DECLARE v_prioridad VARCHAR(10);

  SELECT id_cliente INTO v_id_cliente
  FROM clientes
  WHERE identificacion = p_identificacion AND activo = 1
  LIMIT 1;

  IF v_id_cliente IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cliente no encontrado. Registre el cliente antes de agendar.';
  END IF;

  SELECT id_mascota INTO v_id_mascota
  FROM mascotas
  WHERE id_cliente = v_id_cliente AND nombre = p_mascota
  LIMIT 1;

  IF v_id_mascota IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Mascota no encontrada para este cliente.';
  END IF;

  SELECT COUNT(*) INTO v_ocupado
  FROM citas
  WHERE id_veterinario = p_id_veterinario
    AND fecha_cita = p_fecha
    AND hora_cita = p_hora
    AND estado NOT IN ('Cancelada', 'Finalizada');

  IF v_ocupado > 0 THEN
    SIGNAL SQLSTATE '45001'
      SET MESSAGE_TEXT = 'Horario no disponible. Elija otro.';
  END IF;

  SET v_prioridad = CASE p_tipo_caso
    WHEN 'Emergencia' THEN 'Alta'
    WHEN 'Consulta general' THEN 'Media'
    WHEN 'Vacunacion' THEN 'Baja'
    ELSE 'Media'
  END;

  INSERT INTO citas
    (id_mascota, id_cliente, id_veterinario, tipo_caso, prioridad, fecha_cita, hora_cita, estado, accion_dmn, observaciones)
  VALUES
    (v_id_mascota, v_id_cliente, p_id_veterinario, p_tipo_caso, v_prioridad, p_fecha, p_hora, 'Confirmada', 'Confirmar cita por identificacion', p_observaciones);

  SELECT
    LAST_INSERT_ID() AS id_cita,
    v_id_cliente AS id_cliente,
    v_id_mascota AS id_mascota,
    cl.identificacion,
    CONCAT(cl.nombres, ' ', cl.apellidos) AS dueno,
    cl.telefono,
    cl.email
  FROM clientes cl
  WHERE cl.id_cliente = v_id_cliente;
END$$

DROP PROCEDURE IF EXISTS sp_actualizar_estado_cita$$
CREATE PROCEDURE sp_actualizar_estado_cita(
  IN p_id_cita INT UNSIGNED,
  IN p_estado_nuevo VARCHAR(30),
  IN p_cambiado_por VARCHAR(100)
)
BEGIN
  DECLARE v_estado_anterior VARCHAR(30);

  SELECT estado INTO v_estado_anterior
  FROM citas
  WHERE id_cita = p_id_cita
  LIMIT 1;

  IF v_estado_anterior IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cita no encontrada.';
  END IF;

  UPDATE citas
  SET estado = p_estado_nuevo
  WHERE id_cita = p_id_cita;

  INSERT INTO historial_cambios (id_cita, estado_anterior, estado_nuevo, cambiado_por)
  VALUES (p_id_cita, v_estado_anterior, p_estado_nuevo, p_cambiado_por);
END$$

DELIMITER ;

-- Pruebas:
-- CALL sp_registrar_cliente_mascotas('2001', 'Maria', 'Garcia', '3100000000', 'maria@email.com', 'Ibague', '[{"nombre":"Toby","especie":"Perro"},{"nombre":"Milo","especie":"Gato"}]');
-- CALL sp_agendar_cita_identificacion('2001', 'Toby', 'Perro', 1, 'Consulta general', '2026-06-21', '10:00:00', 'Primera consulta');
-- CALL sp_actualizar_estado_cita(1, 'Cancelada', 'frontend');
