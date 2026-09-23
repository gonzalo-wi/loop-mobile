export type DispenserMovementType = 'LOAD' | 'UNLOAD';

export type DispenserMovementStatus =
  | 'REGISTERED'
  | 'SENT_TO_AGUAS'
  | 'AGUAS_ERROR'
  // Final: todos los seriales quedaron excluidos, no se envió nada a Aguas (ni habrá reintento).
  | 'SKIPPED_UNREGISTERED'
  | 'CANCELLED';

/** Item de catálogo de Aguas (ubicación o estado). */
export type AguasCatalogItem = {
  id: number;
  descripcion: string;
};

/**
 * Catálogo de Aguas separado por tipo de operación.
 * - salida_camion → se usa en LOAD (carga)
 * - vuelta_camion → se usa en UNLOAD (descarga)
 */
export type AguasCatalog = {
  salida_camion: AguasCatalogItem[];
  vuelta_camion: AguasCatalogItem[];
};

/** Estado del envío a Odoo. `null` = todavía sin resolver (pendiente/en proceso). */
export type OdooStatus = 'SENT' | 'ERROR' | null;

export type DispenserMovement = {
  id: string;
  type: DispenserMovementType;
  routeCode: string;
  technician: string;
  locationId: number;
  stateId: number;
  movementDate: string;
  status: DispenserMovementStatus;
  serials: string[];
  /**
   * Subconjunto de `serials` que el backend dejó afuera de Aguas:
   *  - UNLOAD: no normalizados (jMobile) → se derivan a la ubicación de no normalizados en Odoo.
   *  - LOAD: no disponibles en Odoo (expedición) → no se envían.
   * Opcional por compatibilidad con respuestas viejas; usar `getExcludedSerials`.
   */
  excludedSerials?: string[];
  aguasMovementId: string | null;
  registeredBy: string;
  registeredByUsername: string;
  createdAt: string;
  updatedAt: string;
  // Integración Odoo — solo aplica a movimientos LOAD. Es asíncrona: no viene
  // resuelta en la respuesta del POST de creación, hay que re-consultar.
  odooStatus: OdooStatus;
  odooPickingName: string | null;
  odooPickingId: number | null;
  odooReference: string | null;
  // Derivación a Odoo de los no normalizados (solo UNLOAD con excluidos). Asíncrona e
  // independiente de Aguas y del ingreso a reparación. Opcionales por compatibilidad.
  odooNoNormalizadoStatus?: OdooStatus;
  odooNoNormalizadoPickingId?: number | null;
  odooNoNormalizadoPickingName?: string | null;
};

export type CreateMovementPayload = {
  type: DispenserMovementType;
  routeCode: string;
  technician: string;
  // Opcionales: si no se envían, el backend aplica el default según el tipo.
  locationId?: number;
  stateId?: number;
  movementDate?: string;
  serials: string[];
};

/** Equipo disponible en Odoo para cargar (GET /dispenser-movements/odoo/available-equipment). */
export type OdooEquipment = {
  serie: string;
  producto: string;
  ubicacion: string;
  fecha_disponible: string;
};

/** Respuesta paginada del listado de equipos disponibles en Odoo. */
export type OdooAvailableEquipment = {
  success: boolean;
  total: number;
  devueltos: number;
  equipos: OdooEquipment[];
};

/**
 * Resultado normalizado de validar una serie contra Odoo
 * (POST /dispenser-movements/odoo/validate-equipment). Contrato confirmado
 * contra stage: los campos cambian según disponibilidad.
 *  - disponible=true  → trae `serie_odoo` y `ubicacion` (motivo null)
 *  - disponible=false → trae `motivo` (serie_odoo y ubicacion null)
 */
export type OdooValidationResult = {
  serie: string;
  disponible: boolean;
  motivo: string | null;
  serie_odoo: string | null;
  ubicacion: string | null;
};
