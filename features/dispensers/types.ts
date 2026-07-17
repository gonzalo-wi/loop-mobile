export type DispenserMovementType = 'LOAD' | 'UNLOAD';

export type DispenserMovementStatus =
  | 'REGISTERED'
  | 'SENT_TO_AGUAS'
  | 'AGUAS_ERROR'
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
  aguasMovementId: string | null;
  registeredBy: string;
  registeredByUsername: string;
  createdAt: string;
  updatedAt: string;
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
