# Productos — App Mobile

Endpoint para cargar el catálogo de productos al armar un control de stock.

---

## Listar productos

```
GET /products
Authorization: Bearer <token>
```

Los productos vienen ordenados por `displayOrder` ascendente — ese es el orden en que deben mostrarse en la pantalla.

### Query params

| Param  | Tipo    | Descripción                                     |
|--------|---------|-------------------------------------------------|
| `page` | integer | Número de página, empieza en `0` (default: `0`) |
| `size` | integer | Resultados por página (default: `20`)           |
| `sort` | string  | Ordenamiento (default: `displayOrder,asc`)      |

> Para la app se recomienda traer todos los productos activos de una sola vez:
> ```
> GET /products?size=200&sort=displayOrder,asc
> ```

### Response `200 OK`

```json
{
  "data": {
    "content": [
      {
        "id": "uuid-del-producto",
        "code": "PRD001",
        "name": "Bidón 20L",
        "displayOrder": 1,
        "description": "Bidón retornable de 20 litros",
        "type": "RETORNABLE",
        "unit": "UN",
        "packQuantity": 1,
        "active": true,
        "createdAt": "2026-01-10T09:00:00",
        "updatedAt": "2026-01-10T09:00:00"
      },
      {
        "id": "uuid-del-producto-2",
        "code": "PRD002",
        "name": "Saborizada 500ml",
        "displayOrder": 2,
        "description": null,
        "type": "DESCARTABLE",
        "unit": "UN",
        "packQuantity": 6,
        "active": true,
        "createdAt": "2026-01-10T09:00:00",
        "updatedAt": "2026-01-10T09:00:00"
      }
    ],
    "totalElements": 15,
    "totalPages": 1,
    "size": 200,
    "number": 0
  }
}
```

### Campos de cada producto

| Campo          | Tipo    | Descripción                                                   |
|----------------|---------|---------------------------------------------------------------|
| `id`           | UUID    | ID del producto — se usa como `productId` al crear el control |
| `code`         | string  | Código del producto                                           |
| `name`         | string  | Nombre del producto                                           |
| `displayOrder` | integer | Orden de visualización en pantalla                            |
| `description`  | string  | Descripción (puede ser `null`)                                |
| `type`         | string  | `RETORNABLE` o `DESCARTABLE`                                  |
| `unit`         | string  | Unidad de medida (ej. `UN`, `LT`, `KG`)                      |
| `packQuantity` | integer | Cantidad por pack o bulto                                     |
| `active`       | boolean | Si el producto está activo                                    |

> Solo mostrar productos con `active: true`. Los productos inactivos no pueden usarse en controles y el backend los rechaza con `409`.

---

## Cómo usar esto para armar el control de stock

1. Al abrir la pantalla de nuevo control → llamar `GET /products?size=200&sort=displayOrder,asc`
2. Mostrar la lista de productos activos en el orden que vienen
3. El repartidor/controlador ingresa para cada producto:
   - `totalQuantity` — cantidad total
   - `fullQuantity` — cantidad llena
   - `exchangeQuantity` — cantidad de cambio
4. Con esos datos armar el body del `POST /stock-controls` (ver [STOCK_CONTROLS.md](STOCK_CONTROLS.md))

**Ejemplo de item para el control:**
```json
{
  "productId": "uuid-del-producto",
  "totalQuantity": 10,
  "fullQuantity": 8,
  "exchangeQuantity": 2
}
```
