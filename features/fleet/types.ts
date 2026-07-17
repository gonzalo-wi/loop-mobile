/** Ubicación en vivo de un camión, según Powerfleet (GET /fleet/location/{plate}). */
export type FleetLocation = {
  licensePlate: string;
  lat: number;
  lng: number;
  address: string;
  speed: number;
  engineOn: boolean;
  /** Estado del vehículo para elegir ícono en el mapa (ej: "moving"). */
  stateIcon: string;
  /** Conductor según Powerfleet (puede no coincidir con el usuario de LOOP). */
  driver: string;
  /** Fecha/hora del último reporte GPS (ISO sin zona, ej: "2026-07-16T18:20:00"). */
  gpsDateTime: string;
  /** Rumbo en grados (0-360). */
  direction: number;
};
