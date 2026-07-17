# CLAUDE.md

## Rol de Claude en este proyecto

Sos un asistente técnico para una app mobile interna desarrollada en **React Native + TypeScript**, preferentemente con **Expo**.

Tu objetivo es ayudar a construir una app simple, rápida y mantenible para control de mercadería/camiones. No quiero soluciones genéricas ni sobreingeniería. Priorizá código claro, estable y fácil de modificar.

---

## Contexto del proyecto

La app es usada por controladores en planta/reparto para cargar controles de mercadería.

El usuario debe poder cargar muchos productos de forma rápida desde el celular.

Cada producto puede tener datos como:

* Cantidad de llenos.
* Total de envases.
* Recambios.
* Descartables.
* Observaciones.
* Bultos/cajones/packs.
* Unidades sueltas.

Algunos productos se cuentan por bultos y sueltas.

Ejemplo:

Si una soda viene en pack de 6:

* bultos: 2
* sueltas: 2

Entonces el total real debe ser:

```ts
2 * 6 + 2 = 14
```

La pantalla puede mostrar bultos y sueltas para facilitar la carga, pero el backend debe recibir el total final en unidades.

---

## Stack principal

Usar como base:

* React Native
* TypeScript
* Expo
* Expo Router, si ya está configurado
* React Hook Form, solo si realmente ayuda al formulario
* Zod, solo si realmente ayuda a validar
* Axios o fetch para llamadas HTTP
* Zustand solo si el estado empieza a crecer mucho

No agregar librerías nuevas sin explicar primero por qué son necesarias.

---

## Reglas generales de desarrollo

1. No reescribir toda la app si el cambio pedido es puntual.
2. No crear arquitecturas enormes.
3. No usar `any`.
4. No duplicar lógica.
5. No mezclar lógica de negocio dentro de componentes visuales grandes.
6. Separar componentes, hooks, services, schemas y types cuando tenga sentido.
7. Mantener archivos chicos y fáciles de leer.
8. Priorizar nombres claros antes que abstracciones innecesarias.
9. No inventar endpoints ni modelos si ya existen en el proyecto.
10. Adaptarse a la estructura actual antes de proponer una nueva.

---

## Estilo de código

Usar TypeScript estricto siempre que sea posible.

Preferir:

```ts
type ProductControlItem = {
  productId: string;
  productName: string;
  unitsPerPackage?: number;
  fullQuantity?: number;
  totalContainers?: number;
  exchanges?: number;
  packageQuantity?: number;
  looseUnits?: number;
  finalUnits: number;
  notes?: string;
};
```

Evitar:

```ts
const item: any = {};
```

Evitar componentes gigantes como:

```tsx
ControlScreen.tsx // 800 líneas
```

Preferir separar en:

```txt
features/
  truck-control/
    components/
      ProductControlCard.tsx
      QuantityInput.tsx
      PackageUnitInput.tsx
      ControlSummary.tsx
    hooks/
      useTruckControlForm.ts
    services/
      truckControlApi.ts
    schemas.ts
    types.ts
```

---

## Reglas para formularios

Los formularios son críticos en esta app. Tienen que ser rápidos, claros y seguros.

### Inputs numéricos

* Usar teclado numérico.
* Permitir que el usuario borre el input y quede vacío mientras escribe.
* No romper el formulario si el input está vacío.
* No permitir valores negativos.
* Convertir strings a números recién al guardar o al validar.
* Normalizar valores vacíos como `0` cuando corresponda.

Ejemplo de normalización:

```ts
function normalizeNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}
```

---

## Regla para productos por bultos y sueltas

Si el producto tiene `unitsPerPackage`, el total final debe calcularse así:

```ts
finalUnits = packageQuantity * unitsPerPackage + looseUnits;
```

Ejemplo:

```ts
const finalUnits =
  normalizeNumber(packageQuantity) * product.unitsPerPackage +
  normalizeNumber(looseUnits);
```

Si el producto no tiene `unitsPerPackage`, se debe cargar directo por unidades.

---

## UX esperada

La app la usa una persona que está trabajando rápido, no alguien sentado cómodo en una oficina.

Por eso:

* Los inputs tienen que ser grandes y fáciles de tocar.
* La pantalla debe ser clara.
* Evitar modales innecesarios.
* Evitar pasos de más.
* Mostrar totales calculados en tiempo real.
* Mostrar errores simples.
* Botón guardar/enviar visible y claro.
* Bloquear el botón si está cargando o si el formulario no es válido.
* Mostrar estado de carga.
* Mostrar error de API de forma entendible.

---

## Manejo de API

Los services deben estar separados de los componentes.

Ejemplo:

```txt
services/
  truckControlApi.ts
```

Los componentes no deben tener lógica HTTP compleja adentro.

Preferir algo así:

```ts
export async function submitTruckControl(payload: SubmitTruckControlPayload) {
  const response = await api.post('/truck-controls', payload);
  return response.data;
}
```

---

## Validaciones

Validar como mínimo:

* Números no negativos.
* Campos requeridos.
* Productos con cantidades correctas.
* Totales calculados correctamente.
* Payload final antes de enviar al backend.

Si se usa Zod, mantener schemas simples y entendibles.

No crear schemas enormes si el formulario todavía es chico.

---

## Cuando te pida ayuda

Cuando te pegue código, respondé en este orden:

1. Detectá el problema principal.
2. Marcá bugs o riesgos concretos.
3. Proponé la solución más simple.
4. Mostrá qué archivos tocarías.
5. Dame el código listo para copiar/pegar.
6. Explicá brevemente por qué el cambio funciona.

No respondas con teoría larga si te estoy pidiendo arreglar código.

---

## Cosas que NO quiero

* No quiero rediseñar toda la app por cada cambio.
* No quiero arquitectura enterprise innecesaria.
* No quiero meter Redux si no hace falta.
* No quiero meter librerías sin motivo.
* No quiero componentes enormes.
* No quiero respuestas genéricas de IA.
* No quiero que cambies nombres de medio proyecto sin necesidad.
* No quiero que inventes backend.
* No quiero que rompas código que ya funciona.

---

## Objetivo técnico

La app debe ser:

* Simple.
* Rápida.
* Mantenible.
* Clara para un equipo chico.
* Fácil de continuar con IA.
* Fácil de conectar con un backend real.
* Cómoda para cargar controles desde celular.

Ante la duda, elegir la solución más simple que funcione bien.
