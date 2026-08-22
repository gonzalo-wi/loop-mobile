# Changelog

Todos los cambios notables de la app mobile se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Integración con Odoo para el flujo de carga (LOAD) de dispensers, en
  paralelo a Aguas y sin cambiar el registro del movimiento: 4 campos nuevos
  (`odooStatus`, `odooPickingName`, `odooPickingId`, `odooReference`), re-fetch
  corto del estado de Odoo tras crear la carga y en el detalle, banner y chip
  de estado de Odoo independientes de los de Aguas, panel de equipos
  disponibles en Odoo y validación de series escaneadas antes de confirmar.
- Corrección de controles de entrada (ENTRY) ya enviados a Aguas, disponible
  solo para el rol SUPERVISOR: botón "Corregir control" en el detalle del
  control cuando su estado es SENT_TO_AGUAS o AGUAS_ERROR, formulario con
  motivo obligatorio, edición de ítems y camión ordenado, y refresco
  automático del remito de Aguas tras confirmar.
- Suite de tests (Jest + ts-jest) para el proyecto.

### Changed
-

### Fixed
-

### Removed
-
