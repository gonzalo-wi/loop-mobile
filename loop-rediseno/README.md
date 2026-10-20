# LOOP · Rediseño — paquete para implementar

Contenido:

- `DESIGN.md` — especificación: principios, colores, tipografía, componentes, reglas y lo que falta.
- `png/` — las 27 pantallas como imagen.
- `screens/` — las 27 pantallas como HTML (se abren en cualquier navegador; los enlaces entre pantallas funcionan).
- `assets/logo-loop.png` — logo provisorio.
- `resumen.png` — todas las pantallas juntas.

## Cómo usarlo con Claude Code

1. Copiá esta carpeta dentro del repositorio de la app, por ejemplo en `design/loop-rediseno/`.
2. Abrí Claude Code en la raíz del repositorio.
3. Pegá este mensaje:

```text
Quiero rediseñar la interfaz de esta app (LOOP) siguiendo las maquetas que están en design/loop-rediseno/.

Antes de escribir código:
1. Leé design/loop-rediseno/DESIGN.md completo. Es la fuente de verdad.
2. Mirá las imágenes de design/loop-rediseno/png/ y, para los valores exactos (colores, tamaños, radios, espaciados), el HTML de design/loop-rediseno/screens/: están en los estilos inline.
3. Recorré el proyecto y contame qué stack usa, dónde están hoy los estilos o el tema, qué componentes compartidos existen y qué pantallas hay. Armá una tabla "pantalla actual → maqueta" y marcá las pantallas que no tienen maqueta.

Reglas:
- Solo cambia la capa visual. No toques lógica de negocio, navegación, llamadas a la API, validaciones ni nombres de campos.
- No copies el HTML: es una referencia visual. Implementá con los componentes y el sistema de estilos nativo del proyecto.
- Primero los tokens (colores, tipografía, radios, espaciados, sombras) en un único archivo de tema; después los componentes compartidos de la sección 3 de DESIGN.md; recién después las pantallas.
- Sumá la tipografía Plus Jakarta Sans (pesos 500, 600, 700 y 800) como recurso de la app.
- Usá los safe area insets reales en lugar de los márgenes fijos de las maquetas, y la librería de íconos que ya tenga el proyecto.
- Donde DESIGN.md propone un texto o un comportamiento nuevo (sección 6), no lo implementes sin preguntarme.
- Las pantallas sin maqueta se adaptan con los mismos tokens y componentes, sin inventar funciones.
- Nada de modo oscuro.

Forma de trabajo:
- Mostrame el plan por etapas y esperá mi OK antes de implementar.
- Una etapa por vez: tema → componentes → Login e Inicio → Dispensers (vacío, con equipos, descarga, serial a mano) → Escáner y sus avisos → Movimientos y detalle de reparto → paneles de error y actualización → Pedidos, En ruta e Historial → rol repartidor → resto de pantallas.
- Al terminar cada etapa, compilá, corré lint y tests, y decime qué archivos cambiaste y qué quedó distinto de la maqueta y por qué.
```

## Antes de publicar

- Reemplazar `assets/logo-loop.png` por el logo original.
- Resolver los puntos abiertos de la sección 6 de `DESIGN.md`.
