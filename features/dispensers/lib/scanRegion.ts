/**
 * Filtro de región de escaneo para el escáner de dispensers.
 *
 * expo-camera no tiene una región de escaneo nativa: `onBarcodeScanned` se
 * dispara con cualquier código que decodifique en todo el frame de la
 * cámara, no solo el que está dentro del recuadro visual. Este módulo es
 * lógica pura (sin imports nativos) para poder filtrar en JS y quede
 * unit-testeable sin renderizar el componente.
 */

export type Rect = { x: number; y: number; width: number; height: number };

/** Margen de tolerancia aplicado sobre el ancho/alto del recuadro visual (12%). */
export const SCAN_FRAME_TOLERANCE = 0.12;

/** Punto 2D mínimo compatible con `cornerPoints`/`bounds.origin`. */
type Point = { x: number; y: number };

/**
 * Subconjunto estructural de `BarcodeScanningResult` (expo-camera) que
 * necesitamos para ubicar el código en pantalla. Se define localmente en vez
 * de importar el tipo real para no arrastrar dependencias nativas a este
 * módulo puro; es compatible con el tipo de expo-camera por duck typing.
 */
export type ScanGeometry = {
  bounds?: { origin: Point; size: { width: number; height: number } };
  cornerPoints?: Point[];
};

/**
 * Rectángulo del recuadro de escaneo, centrado en la cámara y expandido por
 * `tolerance` (proporción sobre el ancho/alto del frame) para no ser
 * demasiado estricto con lecturas que caen justo en el borde.
 */
export function getFrameRect(
  cameraWidth: number,
  cameraHeight: number,
  frameWidth: number,
  frameHeight: number,
  tolerance: number = SCAN_FRAME_TOLERANCE,
): Rect {
  const expandedWidth = frameWidth * (1 + tolerance);
  const expandedHeight = frameHeight * (1 + tolerance);
  return {
    x: cameraWidth / 2 - expandedWidth / 2,
    y: cameraHeight / 2 - expandedHeight / 2,
    width: expandedWidth,
    height: expandedHeight,
  };
}

function isValidPoint(p: Point | undefined): p is Point {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

/**
 * Centro aproximado de la lectura en coordenadas de pantalla. Prioriza el
 * promedio de `cornerPoints` (más preciso); si no hay ninguno válido, cae a
 * `bounds.origin + size/2`. Si no hay geometría usable, devuelve `null` (el
 * dispositivo no reportó posición).
 */
export function getResultCenter(result: ScanGeometry): Point | null {
  const corners = (result.cornerPoints ?? []).filter(isValidPoint);
  if (corners.length > 0) {
    const sum = corners.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / corners.length, y: sum.y / corners.length };
  }

  const bounds = result.bounds;
  if (bounds && isValidPoint(bounds.origin) && bounds.size) {
    const { origin, size } = bounds;
    if (size.width || size.height) {
      return { x: origin.x + size.width / 2, y: origin.y + size.height / 2 };
    }
  }

  return null;
}

/**
 * True si el centro de la lectura cae dentro de `rect`. Si no hay geometría
 * disponible (`getResultCenter` devuelve `null`), se acepta la lectura: es
 * el fallback para no romper el escaneo en dispositivos que no reportan
 * posición.
 */
export function isWithinFrame(result: ScanGeometry, rect: Rect): boolean {
  const center = getResultCenter(result);
  if (!center) return true;

  return (
    center.x >= rect.x &&
    center.x <= rect.x + rect.width &&
    center.y >= rect.y &&
    center.y <= rect.y + rect.height
  );
}
