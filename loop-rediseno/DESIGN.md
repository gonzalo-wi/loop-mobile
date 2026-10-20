# LOOP · Rediseño — especificación de diseño

Dirección elegida: **C · Bloques de color**. Interfaz clara (se usa al sol; el modo oscuro quedó descartado por los reflejos), bloques de color pleno, todo muy redondeado, tipografía pesada y una sola acción principal por pantalla.

Este documento es la fuente de verdad para implementar. Las maquetas están en:

- `png/` — una imagen por pantalla (390 × 844 pt, exportadas a 2x; 27 en total).
- `screens/` — el HTML de cada pantalla. Los valores exactos (colores, tamaños, radios, espaciados) están en los estilos inline; ante la duda, mandan sobre este documento.
- `assets/logo-loop.png` — logo recortado de una captura, en baja resolución y pensado solo para fondo marino. **Reemplazar por el logo original.**
- `resumen.png` — todas las pantallas juntas.

## 1. Principios

1. **Legible al sol.** Fondos claros, texto marino oscuro, botones y avisos con color sólido (nada translúcido sobre claro). Contraste mínimo 4.5:1 en texto.
2. **Una acción principal por pantalla**, siempre abajo, al alcance del pulgar. Con la lista vacía es "Escanear"; con equipos cargados pasa a ser "Enviar".
3. **El color indica el sentido del movimiento.** Azul = sale / sube (Salida, Carga). Verde = entra / baja (Entrada, Descarga).
4. **El color indica el estado.** Verde = bien. Naranja = advertencia o en curso. Rojo = error, rechazo o acción destructiva. El color nunca va solo: siempre acompaña un texto o un ícono.
5. **Nada se corta.** Ningún dato operativo (hora, motivo, serial) puede quedar truncado con "…"; si no entra, baja de línea.
6. **Objetivos táctiles de 44 pt como mínimo.**

## 2. Tokens

### Color

| Token | Valor | Uso |
|---|---|---|
| `crema` | `#F2F0EA` | Fondo de todas las pantallas |
| `blanco` | `#FFFFFF` | Superficies: tarjetas, filas, campos, pastillas |
| `marino` | `#121C4E` | Texto principal, botón primario, bloque Dispensers, login |
| `tinta2` | `#4D5578` | Texto secundario sobre blanco o crema |
| `tinta2-sobre-verde` | `#1F2B4F` | Texto secundario sobre verde |
| `azul` | `#2456E6` | Carga / Salida (bloques, pestaña activa, pastilla de sentido) |
| `azul-texto` | `#1E46C8` | Texto azul sobre blanco (opción activa del selector) |
| `azul-claro` | `#DCE5FF` | Texto secundario sobre azul |
| `verde` | `#8FD45A` | Descarga / Entrada, éxito, confirmaciones (texto encima: marino) |
| `verde-suave` | `#DDF2CB` | Fondo de celda de estado "bien" |
| `verde-punto` | `#3C8A1E` | Punto de estado "bien" |
| `naranja` | `#F08A00` | Advertencia / en curso (texto encima: marino) |
| `naranja-suave` | `#FFE9C7` | Fondo de aviso o celda "en curso" |
| `naranja-texto` | `#8A4B00` | Texto de advertencia sobre blanco |
| `rojo` | `#C8322B` | Error (ícono blanco encima) |
| `rojo-suave` | `#FCE4E1` | Fondo de botón destructivo y celda "rechazado" |
| `rojo-texto` | `#A3271F` | Texto sobre `rojo-suave` |
| `odoo` | `#714B67` | Solo la etiqueta "ODOO" (texto blanco) |
| `linea` | `#ECE9E0` | Divisores dentro de tarjetas blancas |
| `manija` | `#D5D2C8` | Manija de los paneles inferiores |
| `velo` | `rgba(18,28,78,0.55)` | Fondo detrás de paneles inferiores |
| `pastilla-sobre-azul` | `rgba(8,18,84,0.34)` | Pastillas y riel del selector dentro del bloque azul |
| `pastilla-sobre-verde` | `rgba(18,28,78,0.16)` | Ídem dentro del bloque verde |
| `camara-velo` | `rgba(4,6,16,0.6)` | Oscurecido fuera del recuadro del escáner |

### Tipografía

Familia única: **Plus Jakarta Sans** (Google Fonts, licencia OFL; incluir los archivos en la app). Pesos 500, 600, 700 y 800. Los números de reparto, seriales, horas y fechas usan cifras tabulares.

| Estilo | Tamaño / interlínea | Peso | Tracking | Uso |
|---|---|---|---|---|
| Display | 38–40 / 44 | 800 | −0.035em | "Carga registrada" |
| Título de bloque | 28–32 / 34–38 | 800 | −0.03em | "Salida", "Entrada", "No enviado" |
| Título de panel | 26 / 32 | 800 | −0.03em | Títulos de paneles inferiores |
| Título de pantalla | 22 / 28 | 800 | −0.02em | Encabezados, estado de sistema |
| Sección | 18 / 24 | 800 | −0.01em | "Dispensers" |
| Botón primario | 17 | 800 | — | |
| Dato | 16 / 22 | 800 | 0.01em | Seriales, valores |
| Cuerpo | 15 / 22 | 500–600 | — | Explicaciones |
| Etiqueta | 13–14 / 18–20 | 700 | — | Etiquetas de campo, pastillas |
| Secundario | 12–13 / 16–18 | 600 | — | Hora, motivo, subtítulos |
| Etiqueta de sistema | 11 / 14 | 800 | 0.06em, mayúsculas | "AGUAS", "ODOO" |

### Forma, tamaño y espaciado

- **Radios:** bloque de color 32 · tarjeta 24–28 · fila de lista 22 · campo 22 · celda de estado 14 · botones y pastillas completamente redondeados (radio = mitad del alto) · panel inferior 32 arriba, 0 abajo.
- **Altos:** botón primario 60 · botón secundario 52–56 · botón circular 48 (60 en la barra inferior) · pastilla 44 · campo 56–64 · fila de lista 56–68 · celda de estado 36.
- **Márgenes:** 16 a los lados (20 en Login e Inicio). Separaciones internas de 8, 12, 20 y 24.
- **Zonas seguras:** en las maquetas el contenido arranca a 52 pt del borde superior y deja 24 pt abajo. En la app usar los *safe area insets* reales, no esos números fijos.
- **Sombras** (solo en elementos flotantes): botón primario `0 14px 28px -12px rgba(18,28,78,0.6)` · botón blanco flotante `0 14px 28px -14px rgba(18,28,78,0.45)` · barra de pestañas `0 14px 32px -14px rgba(18,28,78,0.4)`. Tarjetas y filas no llevan sombra ni borde.
- **Íconos:** de trazo, 2 pt, puntas y uniones redondeadas, 24 pt (18–20 dentro de pastillas). Usar la librería de íconos que ya tenga el proyecto con ese estilo.

## 3. Componentes

- **Encabezado.** Botón circular blanco "volver" (48), título de pantalla y, a la derecha, una acción en pastilla blanca ("Hoy") o una pastilla de sentido ("↑ Carga al camión", azul).
- **Botón primario.** Píldora marino, texto blanco 17/800, alto 60, con sombra. Uno por pantalla.
- **Botón secundario.** Píldora crema (sobre blanco) o con borde marino de 2 pt (sobre verde), alto 52–56.
- **Botón destructivo.** Píldora `rojo-suave` con texto `rojo-texto` ("Cancelar"). Siempre más angosto que el primario que lo acompaña.
- **Botón circular.** Blanco, 48–60, ícono marino. Con `aria-label` siempre.
- **Pastilla.** Píldora de 44 con ícono + texto 14/700. Blanca sobre crema; oscurecida sobre un bloque de color.
- **Campo.** Blanco (o crema dentro de un panel blanco), alto 56–64, radio 22, sin borde. La etiqueta va arriba (13/700) o adentro a la izquierda con el valor alineado a la derecha (Reparto). Foco: anillo de 3 pt.
- **Selector segmentado.** Riel oscurecido con dos opciones de 44; la activa es una píldora blanca. Se usa para Carga/Descarga y Cargas/Descargas.
- **Bloque de color.** Rectángulo de radio 32 con color pleno. Agrupa los datos del movimiento (azul en Carga, verde en Descarga) o muestra el estado de un sistema.
- **Etiqueta de sistema.** Píldora chica en mayúsculas: "AGUAS" (fondo marino, ícono de gota) y "ODOO" (fondo `odoo`).
- **Fila de dispenser.** Blanca, radio 22. Círculo de estado a la izquierda (verde con tilde / naranja con "!"), serial 16/800, estado de Odoo en una segunda línea, motivo en una tercera, y "quitar" (✕, 44) a la derecha.
- **Celda de estado** (lista de Movimientos). Punto de color + nombre del sistema + estado, sobre el fondo suave del mismo color.
- **Panel inferior.** Para avisos y formularios cortos: velo detrás, manija, ícono circular de 64 con el color del estado, título, texto, botón primario y botón secundario.
- **Aviso flotante.** Píldora marino sobre la barra inferior con el texto y una acción verde ("Deshacer"). Se va solo a los pocos segundos.
- **Barra inferior.** Flota sobre el contenido. Si la lista de atrás puede desplazarse, lleva un degradado crema detrás para que el contenido no se vea entre los botones.
- **Barra de pestañas.** Píldora blanca flotante con cuatro pestañas; la activa es un bloque marino con ícono y texto blancos.
- **Estado vacío.** Tarjeta blanca de radio 32 con ícono en círculo crema, título y una línea de ayuda.
- **Escáner.** Vista de cámara a pantalla completa, recuadro de radio 32 con esquinas de 5 pt (verdes; naranjas si hay aviso), línea de lectura verde, controles blancos sólidos y el resultado de cada lectura en una píldora debajo del recuadro.

## 4. Pantallas

| # | Archivo | Qué es |
|---|---|---|
| 01 | `01-login` | Inicio de sesión. Bloque marino con logo arriba; "Ingresar" siempre habilitado (validar al tocar). |
| 02 | `02-inicio` | Inicio. Salida (azul) y Entrada (verde) lado a lado; Dispensers (marino) debajo; barra de pestañas flotante. |
| 03 | `03-dispensers-vacio` | Dispensers sin equipos. Odoo consultando. Acción principal: "Escanear dispensers". |
| 04 | `04-escaner` | Escáner con lectura correcta ("1999500 agregado"). |
| 05 | `05-dispensers-con-equipos` | Dispensers con equipos. Cada fila muestra su estado en Odoo. Acción principal: "Enviar N dispensers"; escanear queda como botón circular. |
| 06 | `06-descarga` | Igual que 05 en modo Descarga: el bloque de datos pasa a verde. |
| 07 | `07-serial-a-mano` | Panel inferior para ingresar un serial a mano. |
| 08 | `08-escaner-duplicado` | Escáner: el serial ya estaba cargado (aviso naranja, no suma). |
| 09 | `09-escaner-no-disponible-odoo` | Escáner: serial no disponible en Odoo, con "Descartar" / "Agregar igual". |
| 10 | `10-odoo-sin-respuesta-deshacer` | Odoo no respondió (fila naranja con "Reintentar") y aviso "quitado · Deshacer". |
| 11 | `11-envio-fallido` | Panel "No se pudo enviar" con "Reintentar". |
| 12 | `12-carga-registrada` | Confirmación tras registrar, con el estado de Aguas y de Odoo. |
| 13 | `13-movimientos` | Movimientos de hoy: pestañas Cargas / Descargas y estado por sistema en cada tarjeta. |
| 14 | `14-reparto-enviado` | Detalle de un reparto enviado a Aguas y registrado en Odoo. |
| 15 | `15-reparto-excluidos` | Detalle de un reparto con todos los dispensers excluidos, agrupados bajo un solo encabezado. |
| 16 | `16-movimiento-duplicado` | Panel "No se pudo registrar": ya existe un movimiento para ese reparto y fecha. |
| 17 | `17-actualizacion` | Panel "Actualización disponible". |
| 18 | `18-pedido-completado` | Detalle de pedido. Un solo bloque verde reúne estado, "Entregado al repartidor" y las etapas; debajo quién preparó y completó, y los productos con su cantidad. |
| 19 | `19-en-ruta-sin-repartos` | En ruta sin repartos: estado vacío en vez de "0 / 0 / 0 · 100% completado · Todos los repartos llegaron". |
| 20 | `20-historial-sin-controles` | Historial sin controles, con filtro Todos / Salidas / Entradas. |
| 21 | `21-repartidor-inicio` | Inicio del repartidor: bloque verde "Todo al día" (naranja si hay controles pendientes) y resumen de hoy. Se sacaron los botones "Ver historial" / "Ver pedidos" porque repetían la barra de pestañas. |
| 22 | `22-repartidor-pedidos-vacio` | Pedidos sin pedidos: "Sugerir pedido" arriba, estado vacío y "Nuevo pedido" fijo sobre la barra. |
| 23 | `23-repartidor-nuevo-pedido` | Nuevo pedido: cada producto con casilleros grandes de bultos y unidades donde la cantidad se escribe directo con el teclado numérico (sin botones −/+). Vacío muestra "0" de ejemplo; al tocarlo se pone blanco con borde azul. Los productos con cantidad quedan marcados con borde azul y el botón muestra cuántos productos lleva. |
| 24 | `24-repartidor-pedidos` | Pedidos con un pedido: tarjeta con estado en píldora y barra de avance de 3 tramos. |
| 25 | `25-repartidor-pedido-pendiente` | Pedido pendiente: mismo esquema que la 18 pero en bloque naranja, con la etapa actual marcada. |
| 26 | `26-repartidor-remito` | Remito de salida de hoy en un bloque azul (salida = azul) con "Ver remito de hoy". |
| 27 | `27-repartidor-mi-camion` | Mi camión: bloque de estado con la patente (naranja si la ubicación está desactualizada, verde si está al día), mapa con la dirección completa y datos del vehículo. El último reporte aparece una sola vez (antes figuraba tres veces). |

## 5. Reglas de comportamiento

- **Sentido → color.** Al cambiar Carga ↔ Descarga, el bloque de datos cambia azul ↔ verde. La pastilla de sentido del detalle y la pestaña activa de Movimientos siguen la misma regla.
- **Reparto es lo único que se tipea siempre**: es un campo visible. Fecha y técnico vienen precargados y son pastillas que se tocan para editar.
- **Quitar un dispenser no pide confirmación**: se quita y aparece "quitado · Deshacer".
- **Estados por sistema** (Aguas y Odoo por separado): verde "Enviado" / "Registrado", naranja "Enviando…", rojo "Rechazado", naranja "No enviado" cuando quedó excluido.
- **Dispensers no disponibles en Odoo**: se marcan en naranja con "No disponible en Odoo · no se envía" y el motivo completo que devuelve Odoo en la línea siguiente.
- **Cuando varios dispensers comparten el mismo estado** en el detalle, se agrupan bajo un encabezado con el conteo ("9 de 9") en vez de repetir la leyenda por fila.
- **Errores del servidor**: se muestran en español y, cuando el error apunta a otro registro, con un botón que lleva a él.
- **Textos**: español rioplatense, voseo ("Ingresá", "Escaneá", "Corregí").

## 6. Lo que falta o es de ejemplo

- **Sin maqueta todavía:** Control de Salida, Control de Entrada, la lista de Pedidos, un pedido pendiente o en preparación, En ruta con repartos, Historial con controles, selector de fecha, selector de técnico, lista de equipos de Odoo, confirmación de "Cancelar" y el flujo de "Corregir". Para esas pantallas, aplicar los tokens y componentes de este documento.
- **En ruta:** con 0 repartos la app actual muestra "100% completado" y "Todos los repartos llegaron". Con total 0 hay que mostrar el estado vacío (pantalla 19), no un porcentaje.
- **Pantallas de pestaña** (Inicio, Pedidos, En ruta, Historial): título grande de 32 sin botón de volver, fecha debajo y barra de pestañas flotante con la pestaña activa en marino.
- **Rol repartidor:** la barra tiene 5 pestañas (Inicio, Pedidos, Remito, Mi camión, Historial). Pedidos, Remito y Mi camión usan las pantallas 21–27; Historial reutiliza la 20.
- **Nuevo pedido:** las cantidades se escriben, no se suman de a uno (pedido de Gonza). Teclado numérico (`inputmode="numeric"` o su equivalente), solo dígitos, casillero vacío = 0.
- **Propuestas en el rol repartidor:** sacar los accesos duplicados de Inicio y el aviso de ubicación como bloque de estado. El mapa de la maqueta es un placeholder; va el mapa real.
- **Sin maqueta del repartidor:** pedido en preparación, Sugerir pedido (qué muestra al tocarlo) y confirmación tras "Enviar pedido".
- **Textos que son propuesta y no vienen de la app actual:** "Disponible en Odoo", "Registrado" (la app hoy dice "OK"), "Ver ese movimiento", el panel de serial no disponible (09), el aviso de deshacer (10), la pantalla 12 y los textos de 11.
- **Marcador pendiente:** `El equipo está en [ubicación]` representa el motivo que devuelve Odoo; va el texto real completo.
- **Datos de ejemplo:** repartos, nombres, seriales, horas y cantidades salen de capturas de la app o son inventados; no representan datos reales a mostrar.
- **Descarga:** la maqueta 06 no muestra la fila de Odoo porque no se confirmó si ese modo consulta equipos.
- **Envío fallido (11):** el texto no promete reenvío automático; ajustar si la app guarda envíos pendientes.
