# App Mobile — Reglas del proyecto

App mobile React Native/TypeScript para el sistema de logística. Este
archivo se carga automáticamente en cada sesión y en cada subagente.

## Estándares generales

- Respetar la arquitectura y estructura de carpetas ya existente
  (`screens/`, `components/`, `hooks/`, `navigation/`, `store/` o la que
  use el proyecto).
- TypeScript estricto, sin `any`.
- Nada de valores mágicos: colores, spacing, tipografía → siempre desde el
  theme/design tokens. Strings de configuración, endpoints, keys → siempre
  en constantes.
- Componentes con responsabilidad única, lógica de negocio separada en
  hooks.
- Manejo explícito de loading/error/vacío/éxito en toda pantalla con fetch.
- Identidad visual propia del rubro logística/transporte — nada de UI
  genérica de tutorial.

## Flujo de trabajo para nuevas funcionalidades o cambios

1. **`mobile-rn-dev`** — implementa la funcionalidad (lógica, estado,
   navegación, integración con API).
2. **`mobile-rn-designer`** — pule el resultado visual: theme, jerarquía,
   espaciado, identidad visual, estados de UI.
3. **`mobile-rn-tester`** — escribe y corre tests, valida que todo pase en
   verde, incluyendo lo que tocó el designer.
4. **`mobile-rn-reviewer`** — revisión final de código + diseño + tests, da
   veredicto (bloqueantes / sugerencias / ok para commitear).
5. **Solo si el reviewer dio OK**: mostrarle al usuario en la conversación
   principal un resumen de qué se hizo, resultado de tests, y un mensaje de
   commit propuesto. Esperar confirmación explícita del usuario antes de
   `git add` / `git commit`. Nunca commitear sin esa aprobación, aunque el
   review haya salido limpio.
6. Después del commit, agregar entrada en `CHANGELOG.md` (sección
   `[Unreleased]`, categorizada en Added/Changed/Fixed/Removed).

Si el reviewer marca bloqueantes, volver al agente que corresponda
(`mobile-rn-dev` para lógica, `mobile-rn-designer` para visual) y repetir
el ciclo desde el testing — no saltear pasos después de una corrección.

## LOOP system map (all three repos)

LOOP is split across three repos on this machine. Before searching, use this map to pick the right one.

| Repo | Path | What lives there |
|---|---|---|
| `new-loop-api` | `C:\Users\gwinazki.ELJUMILLANO\Desktop\new-loop-api\new-loop-api` (git root is the parent folder) | Spring Boot backend: REST API, PDFs (remito), Aguas / Odoo / Powerfleet integrations, audit log, APK hosting (`/app/version`) |
| `new-loop-front` | `C:\Users\gwinazki.ELJUMILLANO\Desktop\new-loop-front` | React admin panel (Vite). API contract in `api.md` |
| `react-nati` | `C:\Users\gwinazki.ELJUMILLANO\Desktop\react-nati` | Expo / React Native app for warehouse operators and drivers. Release runbook in `docs/RELEASE.md` |

Where common things live:
- **Exit remito PDF** — built by the backend (`stockcontrols/pdf/RemitoPdfGenerator.java`, A5 page). Front and app only download it.
- **Stock control dates** — EXIT `controlDate` = next delivery day (Sunday skipped), ENTRY = today. Backend `resolveControlDate`, app `computeDefaultDate`. `GET /stock-controls`: `from`/`to` filter `controlDate`; `createdFrom`/`createdTo` filter the creation day (what the panel uses for "today").
- **Corrections of controls sent to Aguas** — `POST /stock-controls/{id}/correct`: ENTRY only, roles SUPERVISOR and ADMIN, reason required; re-sends to Aguas.
- **Truck GPS** — backend `fleet/` + `integrations/powerFleet/`; front `deliveries/components/TruckLocationModal.tsx`; app `app/(tabs)/fleet.tsx` (opens maps via `geo:` on Android).
- **App auto-update** — backend `/app/version` + `/app/download/{file}`; app `features/app-update/`; panel `features/app-version/`.

Checks per repo:
- Backend: `./mvnw test` (Git Bash). Postgres-backed tests are skipped unless `LOOP_TEST_DB_URL=jdbc:postgresql://localhost...`. If JUnit reports "ClassSelector ... resolution failed", run `./mvnw clean test` (stale `target/`).
- Front: `npx tsc --noEmit`. `npm run lint` is currently broken (ESLint 9 without `eslint.config.js`); there is no unit-test runner yet.
- App: `npx jest` and `npx tsc --noEmit` (lint has the same ESLint 9 issue).

Server and operations (192.168.0.42):
- Backend API on port 8095, Docker Compose service `app`, container `loop-api-app` (`network_mode: host`). Compose dir: `/opt/apps/loop/homologacion/backend/new_loop_backend/new-loop-api`. The front (dev proxy and build) and the APK (`eas.json`) both point to `http://192.168.0.42:8095`.
- Secrets (DB, JWT, Aguas, `POWERFLEET_USERNAME` / `POWERFLEET_PASSWORD`) live in the `.env` next to that compose file, never in the repo. After editing it: `docker compose up -d --force-recreate app` (`restart` does not reload `.env`). Code changes need `docker compose up -d --build app`.
- Check an env value without printing it: `docker exec loop-api-app sh -c 'printf %s "$VAR" | wc -c'`.
- Logs: `docker logs loop-api-app`. External integration failures are logged with their cause (e.g. `Powerfleet location lookup failed`).
- Users are in Argentina (UTC-3): never use `toISOString()` for calendar dates (it rolls to tomorrow from 21:00).
