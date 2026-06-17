# VetCitas - Modelos de Conocimiento

Aplicacion web estatica para gestionar clientes, mascotas y citas veterinarias con n8n y MySQL.

## Flujo actual

- Registra clientes y mascotas desde la pantalla `Clientes`.
- Agenda citas pidiendo la identificacion del propietario.
- Lista citas desde MySQL mediante n8n.
- Usa reglas DMN simples para prioridad y disponibilidad.
- Envia confirmacion por email desde el flujo n8n.

## Base de datos MySQL

Antes de importar el workflow, ejecute el script completo:

```sql
SOURCE migrations/20260617_identificacion_clientes.sql;
```

Este script borra y recrea la base `vetcitas`. Incluye `clientes.identificacion`, datos de prueba y los procedimientos:

- `sp_registrar_cliente_mascota`
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
POST /api/webhook/nueva-cita
GET  /api/webhook/citas
```

Nginx redirige `/api/webhook/*` hacia el servidor n8n configurado en `nginx.conf`.
