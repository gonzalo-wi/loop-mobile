# LOOP — Documentación técnica / Handoff

App mobile interna de **control operativo de repartos** (marca **Loop**, cliente Ivess).
La usan **repartidores** y **personal de logística/control** en planta y reparto, desde un teléfono Android.

> Este documento es el punto de entrada para alguien que agarra el proyecto por primera vez.
> Última actualización del handoff: julio 2026.

---

## 1. Stack

| Área | Tecnología |
|---|---|
| Framework | React Native + **Expo SDK 54** (New Architecture activada) |
| Lenguaje | TypeScript (estricto, sin `any`) |
| Navegación | **expo-router 6** (file-based, en `app/`) |
| Estado global | **Zustand** (`store/`) |
| HTTP | **Axios** (`lib/api.ts`) |
| Storage seguro | `expo-secure-store` (token, usuario, reparto) |
| Íconos | `@expo/vector-icons` (Ionicons + MaterialCommunityIcons) |
| Build / distribución | **EAS Build** → APK (fuera de Play Store) |

No usa Redux, React Hook Form ni Zod. Mantener **simple**: componentes chicos, lógica separada en `features/*/services`, nada de sobreingeniería.

---

## 2. Cómo correrlo (desarrollo)

**Requisitos:** Node 22+, un emulador Android o un celular físico.

```bash
npm install
npx expo start            # Metro; abre en dev
# o directo en un dispositivo Android conectado:
npx expo start --android
```

- **Celular físico (USB o misma WiFi):** el celu tiene que estar en la **misma red** que la PC y que el backend.
- **Emulador Android:** el backend en `localhost` de la PC se alcanza como **`http://10.0.2.2:PUERTO`** (no `localhost`, que dentro del emulador es el propio emulador).
- **Quirk de Expo Go:** cachea el bundle por URL. Si aparece otra app o queda un spinner colgado, `adb shell pm clear host.exp.exponent` y reabrir.
- **Typed routes:** al agregar una pantalla nueva en `app/`, expo-router regenera `.expo/types/router.d.ts` cuando Metro está corriendo. Si `tsc` se queja de una ruta nueva, arrancá Metro para que regenere.

Verificar tipos:
```bash
npx tsc --noEmit
```

---

## 3. Estructura del proyecto

```
app/                         # Rutas (expo-router). Cada archivo = una pantalla.
  _layout.tsx                # Root Stack + guard de auth + <AppUpdateGate/>
  login.tsx
  (tabs)/                    # Bottom tabs
    _layout.tsx              # Config de tabs (por rol, ver §4)
    index.tsx                # HOME. Ramifica: DriverHome | ControllerHome
    orders.tsx               # Pedidos (+ "Sugerir pedido" para repartidor)
    remito.tsx               # Remito PDF del día (repartidor)
    fleet.tsx                # "Mi camión" (ubicación GPS, repartidor)
    arrivals.tsx             # "En ruta" (no repartidor)
    history.tsx              # Historial. Ramifica: DriverHistory | ControllerHistory
  new-control.tsx            # Crear control de salida/entrada
  edit-control.tsx           # Ver/editar un control
  approval-detail.tsx        # Aprobar control pendiente (repartidor)
  create-order.tsx           # Crear pedido (soporta ?suggest=1)
  order-detail.tsx
  dispensers.tsx             # Carga/descarga de dispensers (escaneo)
  dispenser-movements.tsx / dispenser-movement-detail.tsx

features/                    # Lógica por dominio: types + services + components
  auth/            authApi.ts
  stock-controls/  stockControlApi, productsApi, routesApi + componentes de control
  driver/          ordersApi + OrderStatusStepper
  dispensers/      dispenserApi + BarcodeScannerModal
  fleet/           fleetApi (ubicación del camión)
  remito/          remitoApi (descarga + abre el PDF)
  app-update/      appUpdateApi, apkInstaller, utils (auto-actualización)

lib/
  api.ts           # Instancia Axios + interceptores + ApiError
  storage.ts       # SecureStore (token / user / route)
  theme.ts         # Sistema de diseño (colores, tipografía, espaciado)
  useKeyboardHeight.ts

store/
  authStore.ts     # user (id, name, username, role, token), isLoading
  routeStore.ts    # route del repartidor (routeId, routeCode, branch, truckPlate) + pendingCount

components/
  HeroHeader.tsx   # Encabezado azul reutilizable (título, subtítulo, acción)
  AppUpdateGate.tsx# Modal de actualización (se monta en el root)
  ui/              # AppTextField, PrimaryButton, StatusOverlay, AppLogo, etc.
```

**Convención:** una llamada HTTP nueva va en `features/<dominio>/services/*.ts`, nunca dentro de un componente.

---

## 4. Navegación y roles

La UI cambia según `user.role` (de `authStore`):

- **`REPARTIDOR`** (repartidor / driver).
- Roles de control/oficina: **`ADMIN`**, **`CARGADOR_DISPENSERS`**, etc. (todo lo que no sea `REPARTIDOR` cae en la rama "controlador").

Tabs visibles (`app/(tabs)/_layout.tsx`):

| Tab | Repartidor | Controlador/Admin |
|---|---|---|
| Inicio (`index`) | ✔ (pendientes de aprobación) | ✔ (accesos a nuevos controles) |
| Pedidos (`orders`) | ✔ | ✔ |
| Remito (`remito`) | ✔ | — |
| Mi camión (`fleet`) | ✔ | — |
| En ruta (`arrivals`) | — | ✔ |
| Historial (`history`) | ✔ (semana pasada) | ✔ (controles de hoy) |

> **Importante:** para ocultar un tab según rol se usa **`href: null`** en las options, NO `tabBarButton: () => null` (este último dejaba huecos en blanco porque reservaba el espacio). El tab activo muestra el ícono dentro de una cápsula azul (`primaryLight`).

Pantallas fuera de tabs (Stack en `app/_layout.tsx`) → hay que registrarlas en el `<Stack>` **y** en la lista `inProtected` del guard de auth.

---

## 5. Autenticación y sesión

Flujo (en `app/_layout.tsx` → `useAuthGuard` + `login.tsx`):

1. Al arrancar, se leen `token`, `user` y `route` de SecureStore (`lib/storage.ts`).
2. Si hay token+user → `setUser()` en el store → entra a `(tabs)`; si no → `login`.
3. Login (`POST /auth/login`) guarda token + user. Si el rol es `REPARTIDOR`, además busca su reparto (`GET /routes`, `driverId === user.id`) y guarda **`routeId`, `routeCode`, `branchId`, `branchName`, `truckPlate`** en SecureStore + `routeStore`.
4. **401** en cualquier request (menos el login) → el interceptor hace `logout()` automático → el guard redirige a login.

El `truckPlate` guardado en sesión es lo que usa "Mi camión" y el Remito. Sesiones viejas sin `truckPlate` se completan con un re-login.

---

## 6. Capa de API

`lib/api.ts`:
- `BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'`.
- Interceptor de request: agrega `Authorization: Bearer <token>`.
- Interceptor de response: en error, rechaza con **`ApiError`** (extiende `Error`, tiene `.status`). Útil para diferenciar 404/409/502 en las pantallas (ej. `fleet`, `remito`).
- 401 → `logout()`.

### Endpoints usados

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/auth/login` | Login (JWT) |
| GET | `/routes` | Repartos (para asignar el del repartidor / buscador) |
| GET | `/products` | Catálogo de productos de control |
| POST | `/stock-controls` | Crear control (salida/entrada) |
| GET | `/stock-controls/:id` · PATCH `/stock-controls/:id` | Ver / editar control |
| POST | `/stock-controls/:id/approve` | Aprobar (repartidor) |
| GET | `/stock-controls` (`?routeId&type&status&from&to`) | Historial / resumen |
| GET | `/stock-controls/pending-arrivals` | "En ruta" |
| GET | `/stock-controls/remito?routeId&date` | **PDF del remito** (200 PDF; 404/409 = no disponible) |
| GET | `/orderable-products` · POST `/orders` | Crear pedido |
| GET | `/orders` (`?routeId&status&from&to`) · GET `/orders/:id` | Listar / ver pedidos |
| POST | `/orders/:id/start` · `/orders/:id/complete` | Estado del pedido |
| GET/POST/PUT/DELETE | `/dispenser-movements...` + `/aguas/locations`, `/aguas/states` | Dispensers (Aguas) |
| GET | `/fleet/location/:plate` | Ubicación del camión (Powerfleet) |
| GET | `/app/version` | **Auto-actualización** (público, sin token) |

Formato de respuesta general: `{ data: <payload>, message }`; los paginados: `{ data: { content, totalElements, totalPages, size, number } }`.

---

## 7. Variables de entorno / config

- **`.env`** (NO se sube a git — ver `.gitignore`):
  ```
  EXPO_PUBLIC_API_URL=http://IP-DEL-BACKEND:PUERTO
  ```
  Las `EXPO_PUBLIC_*` se inyectan en el bundle en tiempo de build.
- **En dev** manda el `.env`.
- **En los builds de EAS** el `.env` NO viaja (está gitignoreado). La URL de producción está en **`eas.json`** → `build.<profile>.env.EXPO_PUBLIC_API_URL`. **Si cambia el backend, se cambia ahí y se re-buildea.**

Config nativa relevante en **`app.json`**:
- `name: "Loop"`, `version` (¡clave para el auto-update, ver §9!), `android.package`, `icon`, `adaptiveIcon.foregroundImage`.
- Plugin `expo-build-properties` con **`android.usesCleartextTraffic: true`** → necesario porque el backend es **HTTP** (no HTTPS); sin esto, un APK release bloquea las llamadas.
- Plugin `expo-splash-screen` con el logo.
- Permiso `REQUEST_INSTALL_PACKAGES` (para instalar el APK de la actualización) + permisos de cámara.

---

## 8. Funcionalidades principales

- **Controles de salida/entrada** (`new-control`, `edit-control`, `ProductControlCard`): carga rápida de productos. Productos con `packQuantity > 1` muestran Bultos + Sueltas y calculan `total = bultos*pack + sueltas`. **En salida (EXIT) solo se carga el Total** (se ocultan Llenos y Recambios); en entrada se cargan los tres.
- **Aprobación (repartidor):** en Inicio ve controles `PENDING_DRIVER_APPROVAL` y los aprueba en `approval-detail`.
- **Pedidos:** lista del día + crear (`create-order`). **"Sugerir pedido"** abre el form prellenado con el pedido del **mismo día de la semana pasada** (`create-order?suggest=1` → `GET /orders?from=hoy-7&to=hoy-7`).
- **Dispensers:** carga/descarga con **escáner de códigos de barras** (`BarcodeScannerModal`, expo-camera). Permite también **cargar el serial a mano** dentro del escáner. Los seriales se normalizan quitando todos los espacios.
- **Mi camión (`fleet`):** ubicación en vivo del camión por patente (`/fleet/location/:plate`), refresco automático cada 20s mientras el tab está enfocado. Tarjeta con estado (motor/movimiento), vista de mapa estilizada, "Abrir mapa" (Google Maps vía `Linking`) y detalles plegables.
- **Remito (`remito`):** descarga el **PDF** del control de salida del día con el header de auth (`expo-file-system`) y lo abre con el **visor nativo** (`expo-intent-launcher`, Android). Maneja 404/409 ("todavía no disponible").
- **Historial del repartidor:** en vez del historial de controladores, muestra **"la semana pasada, para el mismo día de reparto"** (ancla = próximo día de reparto − 7). Sirve para comparar con lo que va a cargar.
- **Auto-actualización:** ver §9.

---

## 9. Build, release y auto-actualización (LEER)

Distribución **por APK**, fuera de Play Store.

### Buildear
```bash
npx eas-cli build -p android --profile preview   # genera un APK instalable
```
- Perfil **`preview`** = APK (`distribution: internal` + `buildType: apk`). El `production` genera un AAB (solo Play Store, NO instalable directo).
- EAS maneja la firma (keystore) solo. En Windows, **buildear en la nube** (el build local de EAS no está soportado).

### Auto-actualización (feature `app-update`)
Al abrir la app, **antes del login**, `<AppUpdateGate/>` pega a `GET /app/version` (público):
```json
{ "latestVersion": "1.1.0", "apkUrl": "http://.../loop-1.1.0.apk", "mandatory": false, "notes": "..." }
```
- Compara `latestVersion` (semver) contra la **versión nativa instalada** (`expo-application` → `nativeApplicationVersion`, que es el `version` de `app.json` con el que se compiló el APK).
- Si es mayor → modal para descargar (con progreso) e instalar el APK. `mandatory: true` bloquea; `false` deja "Después".
- Si no puede leer la versión instalada, **no ofrece nada** (evita bucles).
- Si el endpoint no existe / falla → no molesta (falla en silencio).

### ⚠️ Reglas de oro del versionado (para no entrar en bucle)
1. El `version` de `app.json` con el que buildeás el APK **tiene que coincidir** con el `latestVersion` que el backend devuelve para ese APK.
   - Backend dice `1.1.0` pero el APK se compiló en `1.0.0` → pide actualizar **para siempre**.
2. Flujo de cada release:
   - Subir `version` en `app.json` (ej. `1.1.0` → `1.2.0`).
   - `eas build` → subir el APK al backend como `loop-<version>.apk`.
   - Actualizar `latestVersion`/`apkUrl` en el backend a esa versión.
3. **La auto-actualización solo funciona desde el primer APK que ya incluya este código** (ese primero se instala a mano). Y **no se prueba en Expo Go** (Expo Go no instala APKs).

Versión actual de `app.json`: **`1.1.0`**.

---

## 10. Sistema de diseño (`lib/theme.ts`)

- **Azul de marca** `#2B50E0` (+ `#1E3BB0` / `#E9EEFF`). Fondo gris azulado `#EDF1F8`, superficies blancas.
- Semánticos: verde `#0FA968` (éxito), naranja `#E8870B` (aviso), rojo `#E5484D` (error), slate para neutro.
- Espaciado base 8 (`S`), radios (`R`), tipografía (`F`, `W`), sombras suaves (`Shdw`).
- Encabezados: `HeroHeader` (azul, con `title`/`subtitle`/`rightAction`). Íconos outline consistentes.

---

## 11. Gotchas / cosas que muerden

- **Backend HTTP:** requiere `usesCleartextTraffic: true` (ya configurado). Si migran a HTTPS, se puede sacar.
- **`.env` no viaja a EAS:** la URL de build vive en `eas.json`. No alcanza con cambiar el `.env` para un APK.
- **Emulador vs físico:** `10.0.2.2` (emulador) vs IP de LAN (físico). El celu tiene que llegar al backend (misma red).
- **New Architecture activada:** `LayoutAnimation` tiene soporte limitado (algún warning no-op es inofensivo).
- **Typed routes** se regeneran con Metro corriendo; si `tsc` falla por una ruta nueva, arrancá Metro.
- **Powerfleet / mapa:** los datos de ubicación son del backend local, pero el mapa de Google necesita **internet real**; si la WiFi de la empresa no tiene salida a internet, el mapa no carga (los datos sí).

---

## 12. Dónde tocar cada cosa (mapa rápido)

| Quiero cambiar… | Archivo |
|---|---|
| URL del backend (dev) | `.env` |
| URL del backend (APK) | `eas.json` → `build.preview.env` |
| Colores / tipografía | `lib/theme.ts` |
| Tabs / navegación / roles | `app/(tabs)/_layout.tsx` |
| Home del repartidor | `app/(tabs)/index.tsx` (`DriverHome`) |
| Un endpoint / llamada nueva | `features/<dominio>/services/*.ts` |
| Comportamiento de un control | `features/stock-controls/components/ProductControlCard.tsx` |
| Auto-actualización | `components/AppUpdateGate.tsx` + `features/app-update/*` |
| Versión de la app | `app.json` → `version` |

---

## 13. Pendientes / ideas a futuro

- Backend `GET /app/version` y hosting del APK en producción (dominio con HTTPS idealmente).
- Confirmar el endpoint `GET /stock-controls/remito` en producción.
- Migrar el backend a **HTTPS** (y sacar `usesCleartextTraffic`).
- Evaluar mapa embebido en "Mi camión" (necesita `react-native-maps` + dev build; hoy abre Google Maps por `Linking`).
- Con 5 tabs, la etiqueta "Mi camión" puede quedar justa en pantallas angostas.

---

_Cualquier duda sobre el porqué de una decisión, casi todo está pensado para ser simple y fácil de continuar. Ante la duda: la solución más simple que funcione._
