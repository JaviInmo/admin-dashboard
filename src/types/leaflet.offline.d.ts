// Type definitions for leaflet.offline
import * as L from 'leaflet';

declare module 'leaflet' {
  namespace tileLayer {
    function offline(
      urlTemplate: string,
      options?: TileLayerOptions
    ): TileLayer;
  }

  interface TileLayer {
    /**
     * Save tiles for offline use
     */
    saveTiles(
      bounds: LatLngBounds,
      minZoom: number,
      maxZoom: number,
      callback?: (saved: number, total: number) => void
    ): void;
  }
}

declare module 'leaflet.offline' {
  import * as L from 'leaflet';
  export = L;
}
