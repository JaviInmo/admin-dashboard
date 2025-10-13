/* src/components/Map/types.ts
   Tipos compartidos para la UI del mapa / markers.
*/

export type GuardLocation = {
	guardId: number;
	lat: number;
	lon: number;
	isOnShift: boolean;
	lastUpdated: string; // ISO
	propertyId?: number | null;
	propertyName?: string | null;
	name?: string | null;
	phone?: string | null;
};
