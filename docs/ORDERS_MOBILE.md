# Pedidos — App Mobile (Repartidor)

Documentación para el módulo de pedidos de la app del repartidor.

---

## Índice

- [Flujo completo](#flujo-completo)
- [Ver productos disponibles](#ver-productos-disponibles)
- [Crear pedido](#crear-pedido)
- [Ver mis pedidos](#ver-mis-pedidos)
- [Ver detalle de un pedido](#ver-detalle-de-un-pedido)
- [Referencia de campos](#referencia-de-campos)

---

## Flujo completo

```
1. App carga el catálogo de productos  →  GET /orderable-products?active=true
2. Repartidor arma el pedido           →  POST /orders
3. App muestra el pedido creado        →  status: PENDING
4. Admin/sistema lo procesa            →  status: IN_PROGRESS (lo hace el admin)
5. Pedido finalizado                   →  status: COMPLETED (lo hace el admin)
```

> El repartidor solo **crea** el pedido. Los cambios de estado los hace el lado administrativo.

---

## Ver productos disponibles

Antes de crear un pedido, cargar el catálogo de productos que se pueden pedir.

```
GET /orderable-products?active=true
Authorization: Bearer <token>
```

#### Response `200 OK`

```json
{
  "data": {
    "content": [
      {
        "id": "uuid-prod-1",
        "code": "SAB-POM",
        "name": "Saborizada Pomelo",
        "description": "Bebida saborizada sabor pomelo 500ml",
        "allowsUnit": true,
        "allowsBulk": true,
        "unitsPerBulk": 6,
        "active": true
      },
      {
        "id": "uuid-prod-2",
        "code": "BOT-AZ-8L",
        "name": "Botellón Azul 8L",
        "description": "Botellón azul retornable de 8 litros",
        "allowsUnit": true,
        "allowsBulk": false,
        "unitsPerBulk": null,
        "active": true
      }
    ],
    "totalElements": 2,
    "totalPages": 1,
    "size": 20,
    "number": 0
  }
}
```

> Usar `allowsUnit` y `allowsBulk` para mostrar u ocultar los campos de cantidad en la UI.
> Mostrar `unitsPerBulk` cuando `allowsBulk: true` para que el repartidor sepa cuántas unidades trae un bulto.

---

## Crear pedido

```
POST /orders
Authorization: Bearer <token>
```

#### Request body

```json
{
  "routeId": "uuid-del-reparto",
  "orderDate": "2026-06-24",
  "observations": "Urgente para mañana",
  "items": [
    {
      "productId": "uuid-prod-1",
      "unitQuantity": 3,
      "bulkQuantity": 1
    },
    {
      "productId": "uuid-prod-2",
      "unitQuantity": 2,
      "bulkQuantity": null
    }
  ]
}
```

| Campo          | Tipo    | Requerido | Default    | Descripción                                        |
|----------------|---------|-----------|------------|----------------------------------------------------|
| `routeId`      | UUID    | Sí        | —          | ID del reparto del repartidor                      |
| `orderDate`    | date    | No        | hoy        | Fecha del pedido (`YYYY-MM-DD`)                    |
| `observations` | string  | No        | —          | Observaciones (máx. 500 caracteres)                |
| `items`        | array   | Sí        | —          | Al menos un producto                               |

**Campos de cada item:**

| Campo          | Tipo    | Requerido | Descripción                                               |
|----------------|---------|-----------|-----------------------------------------------------------|
| `productId`    | UUID    | Sí        | ID del producto (obtenido del catálogo)                   |
| `unitQuantity` | integer | No        | Cantidad en unidades (requerido si el producto solo permite unidades) |
| `bulkQuantity` | integer | No        | Cantidad en bultos (solo si el producto tiene `allowsBulk: true`) |

> Al menos uno de `unitQuantity` o `bulkQuantity` debe ser mayor a 0.
> Se pueden enviar ambos en el mismo item (ej: 3 unidades + 1 bulto del mismo producto).

#### Ejemplos de items válidos

**Producto que permite unidad y bulto:**
```json
{ "productId": "uuid-prod-1", "unitQuantity": 3, "bulkQuantity": 1 }
```

**Producto que solo permite unidad:**
```json
{ "productId": "uuid-prod-2", "unitQuantity": 5 }
```

**Solo bultos:**
```json
{ "productId": "uuid-prod-1", "unitQuantity": null, "bulkQuantity": 2 }
```

#### Response `201 Created`

```json
{
  "data": {
    "id": "uuid-del-pedido",
    "routeId": "uuid-del-reparto",
    "routeCode": "R01",
    "status": "PENDING",
    "orderDate": "2026-06-24",
    "observations": "Urgente para mañana",
    "items": [
      {
        "id": "uuid-item-1",
        "productId": "uuid-prod-1",
        "productCode": "SAB-POM",
        "productName": "Saborizada Pomelo",
        "allowsUnit": true,
        "allowsBulk": true,
        "unitsPerBulk": 6,
        "unitQuantity": 3,
        "bulkQuantity": 1
      },
      {
        "id": "uuid-item-2",
        "productId": "uuid-prod-2",
        "productCode": "BOT-AZ-8L",
        "productName": "Botellón Azul 8L",
        "allowsUnit": true,
        "allowsBulk": false,
        "unitsPerBulk": null,
        "unitQuantity": 2,
        "bulkQuantity": null
      }
    ],
    "createdAt": "2026-06-24T08:00:00",
    "updatedAt": "2026-06-24T08:00:00"
  },
  "message": "Order created successfully"
}
```

#### Errores

**`409 Conflict`** — producto no permite ese tipo de cantidad
```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Product BOT-AZ-8L: does not allow ordering by bulk"
}
```

**`409 Conflict`** — no se indicó ninguna cantidad
```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Product SAB-POM: at least one of unitQuantity or bulkQuantity must be greater than 0"
}
```

**`404 Not Found`** — producto no encontrado
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Orderable product not found: uuid-del-producto"
}
```

---

## Ver mis pedidos

Lista los pedidos del reparto del repartidor, del más reciente al más antiguo.

```
GET /orders?routeId={routeId}
Authorization: Bearer <token>
```

También se puede filtrar por estado:

```
GET /orders?routeId={routeId}&status=PENDING
GET /orders?routeId={routeId}&status=IN_PROGRESS
GET /orders?routeId={routeId}&status=COMPLETED
```

O por fecha:
```
GET /orders?routeId={routeId}&from=2026-06-24&to=2026-06-24
```

#### Response `200 OK`

```json
{
  "data": {
    "content": [ /* array de pedidos */ ],
    "totalElements": 3,
    "totalPages": 1,
    "size": 20,
    "number": 0
  }
}
```

---

## Ver detalle de un pedido

```
GET /orders/{id}
Authorization: Bearer <token>
```

Devuelve el mismo objeto que en la respuesta de creación.

---

## Referencia de campos

### Estados del pedido

| Estado        | Descripción                    | Qué mostrar en la app        |
|---------------|--------------------------------|------------------------------|
| `PENDING`     | Pedido enviado, sin procesar   | "Pendiente"                  |
| `IN_PROGRESS` | Siendo preparado               | "En proceso"                 |
| `COMPLETED`   | Listo / entregado              | "Completado"                 |

### Campos de la respuesta del pedido

| Campo          | Tipo      | Descripción                           |
|----------------|-----------|---------------------------------------|
| `id`           | UUID      | ID del pedido                         |
| `routeId`      | UUID      | ID del reparto                        |
| `routeCode`    | string    | Código del reparto                    |
| `status`       | string    | Estado actual (ver tabla de estados)  |
| `orderDate`    | date      | Fecha del pedido                      |
| `observations` | string    | Observaciones (puede ser `null`)      |
| `items`        | array     | Productos pedidos                     |
| `createdAt`    | datetime  | Fecha de creación                     |
| `updatedAt`    | datetime  | Última actualización                  |

### Campos de cada item en la respuesta

| Campo          | Tipo    | Descripción                                               |
|----------------|---------|-----------------------------------------------------------|
| `id`           | UUID    | ID del ítem                                               |
| `productId`    | UUID    | ID del producto                                           |
| `productCode`  | string  | Código del producto                                       |
| `productName`  | string  | Nombre del producto                                       |
| `allowsUnit`   | boolean | Si el producto se puede pedir por unidad                  |
| `allowsBulk`   | boolean | Si el producto se puede pedir por bulto                   |
| `unitsPerBulk` | integer | Cuántas unidades trae un bulto (`null` si no aplica)      |
| `unitQuantity` | integer | Cantidad pedida en unidades (`null` si no se pidió)       |
| `bulkQuantity` | integer | Cantidad pedida en bultos (`null` si no se pidió)         |
