# Changelog

Todos los cambios notables de la app mobile se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Dispensers no normalizados (los que figuran en la lista de jMobile) en las
  descargas: ahora se envían al backend, que los deriva a la ubicación de no
  normalizados en Odoo sin pasar por reparación. En pantalla se ven en ámbar
  ("No normalizado · va a Odoo"), y en el detalle hay un banner con el estado
  de esa derivación y su comprobante. En las cargas siguen sin enviarse.
- Aviso con diálogo después de registrar o corregir un movimiento cuando el
  backend dejó seriales afuera (`excludedSerials`), con la lista de seriales.
  Los excluidos también se marcan en el detalle y se cuentan en el listado.
- Soporte del estado `SKIPPED_UNREGISTERED` ("No enviado"), que es final y se
  muestra sin spinner. Antes quedaba colgado en "Enviando…" para siempre.
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
- Feedback sonoro en el escáner de dispensers (expo-audio): beep de
  confirmación al agregar un código y sonido de error en duplicados o series
  inexistentes en Aguas, junto a la vibración existente. No bloquea el
  escaneo si el audio falla. Requiere un build nativo nuevo (EAS).
- Etiquetas de accesibilidad (`accessibilityLabel`/`accessibilityRole`) en los
  botones de ícono del escáner (linterna, cerrar, agregar a mano).

### Changed
- Los textos de la validación de seriales hablan de "no normalizado (jMobile)"
  en vez de "inexistente en Aguas", que es de donde sale realmente la lista.
- El escáner de dispensers normaliza el código (sin espacios) antes del
  cooldown anti-duplicado de 2s, para que la deduplicación opere sobre el
  mismo valor que finalmente se agrega.
- Interno: la lógica del escáner (commit/scan/feedback/cooldown) se extrajo a
  un hook puro `useBarcodeCommit`, con la garantía de que un fallo de audio o
  vibración nunca corta el escaneo. Sin cambios visibles; habilita tests
  reales del hook (RTL + jsdom por-archivo).

### Fixed
- El escáner de dispensers ahora solo lee los códigos que caen dentro del
  recuadro visual: antes el recuadro era decorativo y se escaneaba cualquier
  código del encuadre. Ahora se filtra por posición (centro de la lectura vs.
  el recuadro centrado, con 12% de tolerancia) y las lecturas de afuera se
  descartan en silencio. Si falta el layout de la cámara o la lectura no trae
  geometría, no se filtra para no perder lecturas.
- Los seriales de dispensers se sanean al ingresarlos (escaneo y carga manual,
  en ambas pantallas): antes solo se sacaban espacios, así que caracteres como
  `<` o `>` quedaban en el código y rompían la deduplicación, la validación
  contra jMobile/Odoo y lo que se enviaba al backend. Ahora se conserva solo el
  charset válido (`[A-Za-z0-9-]`, respetando mayúsculas/minúsculas).
- El escáner de dispensers ya no interpreta códigos equivocados cuando se
  escanea con el celular en movimiento: antes comiteaba en el primer frame
  decodificado, así que un frame con motion blur podía guardar un número mal
  leído. Ahora `handleScan` exige N lecturas idénticas consecutivas
  (`confirmReads`, default 2) dentro de una ventana corta (`confirmWindowMs`,
  default 400ms) antes de agregar un escaneo de cámara; la carga manual sigue
  siendo inmediata.
- La lista de movimientos ahora muestra las cargas registradas en el día: antes filtraba por la fecha del movimiento (que en las cargas es el próximo día de reparto), así que las cargas creadas hoy no aparecían hasta el día siguiente. Ahora filtra por fecha de registro.
- La pantalla de dispensers ahora refresca los datos: el panel "Equipos
  disponibles en Odoo" y los seriales inexistentes en Aguas solo se cargaban
  al montar la pantalla, así que había que cerrar sesión y volver a entrar
  para ver equipos nuevos de Odoo. Se agrega recarga automática al enfocar la
  pantalla (`useFocusEffect`) y pull-to-refresh en la lista. Durante el
  refresh el panel mantiene el contenido y muestra un indicador
  "Actualizando", sin parpadeos.

### Removed
-
