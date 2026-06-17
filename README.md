# VetCitas - Modelos de Conocimiento

Aplicacion web estatica para gestionar clientes, mascotas y citas veterinarias con n8n y MySQL.

## Flujo actual

- Registra clientes con una o varias mascotas desde la pantalla `Clientes`.
- Gestiona veterinarios activos e inactivos.
- Consulta clientes y mascotas desde MySQL.
- Agenda citas pidiendo la identificacion del propietario, veterinario y horarios disponibles desde MySQL.
- Lista citas desde MySQL mediante n8n.
- Cancela citas en MySQL mediante n8n, conservando el registro.
- Usa reglas DMN simples para prioridad y disponibilidad.
- Envia confirmacion por email desde el flujo n8n.

## Base de datos MySQL

Antes de importar el workflow, ejecute el script completo:

```sql
SOURCE migrations/20260617_identificacion_clientes.sql;
```

Este script borra y recrea la base `vetcitas`. Incluye `clientes.identificacion`, `horarios_atencion`, datos de prueba y los procedimientos:

- `sp_registrar_cliente_mascotas`
- `sp_agendar_cita_identificacion`
- `sp_actualizar_estado_cita`

## Ejecutar con Docker y Nginx

```bash
docker build -t vetcitas .
docker run --rm -p 82:82 vetcitas
```

Luego abra:

```text
http://localhost:82
```

## Endpoints n8n usados

```text
POST /api/webhook/cliente
POST /api/webhook/veterinario
POST /api/webhook/veterinario-estado
POST /api/webhook/nueva-cita
POST /api/webhook/eliminar-cita
GET  /api/webhook/clientes
GET  /api/webhook/veterinarios
GET  /api/webhook/veterinarios-gestion
GET  /api/webhook/mascotas?identificacion=1001
GET  /api/webhook/horarios?fecha=2026-06-17&id_veterinario=1
GET  /api/webhook/citas
```

Nginx redirige `/api/webhook/*` hacia el servidor n8n configurado en `nginx.conf`.
