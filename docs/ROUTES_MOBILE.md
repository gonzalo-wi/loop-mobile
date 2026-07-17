# Repartos — App Mobile

Cómo la app obtiene el reparto que va a controlar.

---

## Cómo funciona

El repartidor tiene un reparto asignado. Al hacer login, la respuesta incluye su `id` de usuario. Con ese dato se busca el reparto que tiene ese usuario como driver.

**Flujo al iniciar la app:**

```
1. Login                    →  guardar userId del response
2. Buscar reparto del user  →  GET /routes?driverId={userId}
3. Guardar routeId          →  usar en controles y pedidos
```

---

## Buscar el reparto del repartidor

```
GET /routes
Authorization: Bearer <token>
```

### Query params

| Param  | Tipo    | Descripción                                    |
|--------|---------|------------------------------------------------|
| `page` | integer | Número de página, empieza en `0` (default: `0`)|
| `size` | integer | Resultados por página (default: `20`)          |
| `sort` | string  | Ordenamiento (default: `code,asc`)             |

> El endpoint devuelve todos los repartos. La app debe filtrar del lado del cliente por `driverId === userId` del usuario logueado.

### Response `200 OK`

```json
{
  "data": {
    "content": [
      {
        "id": "uuid-del-reparto",
        "code": "R01",
        "branchId": "uuid-sucursal",
        "branchName": "Ciudadela",
        "branchCode": "CIU",
        "driverId": "uuid-del-repartidor",
        "driverName": "Juan Pérez",
        "truckPlate": "AB123CD",
        "active": true,
        "observations": null,
        "createdAt": "2026-01-10T09:00:00",
        "updatedAt": "2026-01-10T09:00:00"
      }
    ],
    "totalElements": 5,
    "totalPages": 1,
    "size": 20,
    "number": 0
  },
  "message": "Routes retrieved successfully"
}
```

### Cómo encontrar el reparto del usuario logueado

```
Buscar en content[] el objeto donde driverId === id del login
```

Si no hay ninguno → el usuario no tiene reparto asignado todavía.

---

## Obtener un reparto por ID

Si ya se guardó el `routeId` en sesiones anteriores, se puede traer directamente:

```
GET /routes/{id}
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "data": {
    "id": "uuid-del-reparto",
    "code": "R01",
    "branchId": "uuid-sucursal",
    "branchName": "Ciudadela",
    "branchCode": "CIU",
    "driverId": "uuid-del-repartidor",
    "driverName": "Juan Pérez",
    "truckPlate": "AB123CD",
    "active": true,
    "observations": null,
    "createdAt": "2026-01-10T09:00:00",
    "updatedAt": "2026-01-10T09:00:00"
  },
  "message": "Route retrieved successfully"
}
```

---

## Campos del reparto

| Campo        | Tipo    | Descripción                                            |
|--------------|---------|--------------------------------------------------------|
| `id`         | UUID    | ID del reparto — se usa como `routeId` en controles y pedidos |
| `code`       | string  | Código del reparto (ej. `R01`)                         |
| `branchId`   | UUID    | ID de la sucursal                                      |
| `branchName` | string  | Nombre de la sucursal                                  |
| `branchCode` | string  | Código de la sucursal                                  |
| `driverId`   | UUID    | ID del repartidor asignado (puede ser `null`)          |
| `driverName` | string  | Nombre del repartidor asignado (puede ser `null`)      |
| `truckPlate` | string  | Patente del camión (puede ser `null`)                  |
| `active`     | boolean | Si el reparto está activo                              |

---

## Recomendación de implementación

Guardar en el estado local de la app (SharedPreferences o similar):

```
userId      →  del response del login
routeId     →  del reparto encontrado
routeCode   →  para mostrar en pantalla
branchId    →  para crear controles
```

Estos datos se usan en:
- `POST /stock-controls` → campos `routeId` y `branchId`
- `POST /orders` → campo `routeId`
- `GET /stock-controls?routeId=...` → para ver controles del reparto
- `GET /orders?routeId=...` → para ver pedidos del reparto
