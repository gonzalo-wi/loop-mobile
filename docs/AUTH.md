# Autenticación

## Login

Autentica un usuario y devuelve un token JWT para usar en el resto de las llamadas.

```
POST /auth/login
```

No requiere autorización.

---

### Request

**Headers**
```
Content-Type: application/json
```

**Body**
```json
{
  "username": "juan.perez",
  "password": "mipassword"
}
```

| Campo      | Tipo   | Requerido | Descripción          |
|------------|--------|-----------|----------------------|
| `username` | string | Sí        | Nombre de usuario    |
| `password` | string | Sí        | Contraseña           |

---

### Response `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Juan Pérez",
  "username": "juan.perez",
  "role": "REPARTIDOR"
}
```

| Campo      | Tipo   | Descripción                              |
|------------|--------|------------------------------------------|
| `token`    | string | JWT para incluir en las siguientes llamadas |
| `type`     | string | Siempre `"Bearer"`                       |
| `id`       | UUID   | ID del usuario autenticado               |
| `name`     | string | Nombre completo del usuario              |
| `username` | string | Nombre de usuario                        |
| `role`     | string | Rol del usuario (ver tabla de roles)     |

---

### Roles posibles

| Rol                  | Descripción                        |
|----------------------|------------------------------------|
| `ADMIN`              | Administrador del sistema          |
| `SUPERVISOR`         | Supervisión y reportes             |
| `CONTROLADOR`        | Crea controles de stock            |
| `REPARTIDOR`         | Aprueba o rechaza controles        |
| `PICKER`             | Gestión de pedidos descartables    |
| `CARGADOR_DISPENSERS`| Movimientos de dispensers          |

---

### Cómo usar el token

En todas las llamadas siguientes incluir el token en el header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Errores

**`401 Unauthorized`** — usuario o contraseña incorrectos

```json
{
  "timestamp": "2026-06-24T10:30:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Bad credentials",
  "path": "/auth/login"
}
```

**`403 Forbidden`** — usuario desactivado

```json
{
  "timestamp": "2026-06-24T10:30:00",
  "status": 403,
  "error": "Forbidden",
  "message": "User account is disabled",
  "path": "/auth/login"
}
```

**`400 Bad Request`** — campos vacíos

```json
{
  "timestamp": "2026-06-24T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "username: Username is required",
  "path": "/auth/login"
}
```
