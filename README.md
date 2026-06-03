# VetCitas - Modelos de Conocimiento

Aplicacion web estatica para gestionar citas veterinarias con reglas DMN simples:

- registra citas y las guarda en `localStorage`;
- valida que no se repita la misma fecha y hora;
- asigna prioridad por tipo de caso;
- lista, filtra, confirma, marca pendiente y elimina citas;
- intenta enviar cada cita nueva al webhook de n8n.

## Ejecutar local

Abra `index.html` directamente en el navegador para probar la agenda sin backend.

## Ejecutar con Docker y Nginx

```bash
docker build -t vetcitas .
docker run --rm -p 82:82 vetcitas
```

Luego abra:

```text
http://localhost:82
```

## Webhook de n8n

El frontend envia un `POST` a:

```text
/api/webhook/nueva-cita
```

Nginx lo redirige segun `nginx.conf` hacia:

```text
https://n8nvetcitas.nexuscampusinternational.com/webhook/nueva-cita
```

Payload principal:

```json
{
  "id": 6,
  "dueno": "Maria Garcia",
  "telefono": "310 000 0000",
  "email": "maria@example.com",
  "mascota": "Toby",
  "especie": "Perro",
  "tipo": "Consulta general",
  "prioridad": "Media",
  "fecha": "2026-06-10",
  "hora": "09:00",
  "hora_formateada": "09:00 am",
  "estado": "Confirmada",
  "registrado": "si",
  "obs": "Revision",
  "creado_en": "2026-06-03T12:00:00.000Z"
}
```
