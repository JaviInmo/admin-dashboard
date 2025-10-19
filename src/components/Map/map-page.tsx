/* src/components/Map/map-page.tsx
   Mapa imperativo con Leaflet (sin react-leaflet).
   Muestra también el número de teléfono de los guardias disponibles (obtenido desde getGuard).
*/

import  { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getCachedGuardLocations, type GuardLocation as ServiceGuardLocation } from "@/lib/services/guard";
import type { GuardLocation as GuardLocationType } from "./types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProperties, type AppProperty } from "@/lib/services/properties";
import { addressAutocompleteService } from "@/lib/services/address-autocomplete";
import { Map as MapIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Nota:
 * - Este componente usa Leaflet directamente (L.map...) y no react-leaflet.
 * - Asegúrate de instalar leaflet: pnpm add leaflet
 * - Opcional: pnpm add -D @types/leaflet
 */

type MapPageProps = {
  pollIntervalMs?: number;
  initialZoom?: number;
  center?: [number, number];
};

/**
 * Tipo auxiliar para castear L.Icon.Default y poder borrar la prop privada
 * sin usar `any`.
 */
type IconDefaultWithProto = {
  prototype: {
    _getIconUrl?: unknown;
  };
} & typeof L.Icon.Default;

function ensureIconFix() {
  try {
    delete (L.Icon.Default as IconDefaultWithProto).prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  } catch (err) {
    // Registrar el error por si algo raro pasa; evita bloque vacío y no-unused-vars.
    // No queremos que esto rompa la inicialización.
     
    console.warn("ensureIconFix error:", err);
  }
}

/** Helper para obtener HTML del dot (verde/rojo) */
function dotHtml(isOnShift: boolean) {
  const color = isOnShift ? "#16a34a" : "#ef4444"; // verde / rojo
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;vertical-align:middle;"></span>`;
}

/** Helper para mostrar label de nombre (o fallback ID) en HTML */
function boldNameHtml(name: string | null | undefined, id: number) {
  const label = name && String(name).trim() !== "" ? String(name) : `ID #${id}`;
  return `<strong style="font-weight:600;">${escapeHtml(label)}</strong>`;
}

/** Escape simple para evitar inyección en popup HTML */
function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function GuardsMap({
  pollIntervalMs = 10000,
  initialZoom = 10,
  center: defaultCenter = [29.7604, -95.3698],
}: MapPageProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const propertyMarkerRef = useRef<L.Marker | null>(null);
  const [locations, setLocations] = useState<GuardLocationType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [followGuardId, setFollowGuardId] = useState<number | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const [selectedView, setSelectedView] = useState<'guards' | 'properties'>('guards');
  const [properties, setProperties] = useState<AppProperty[]>([]);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const [showAllProperties, setShowAllProperties] = useState(false);
  const [propertiesSearch, setPropertiesSearch] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<number>>(new Set());
  
  // New intelligent cache system for properties with coordinates
  type PropertyGeoCache = {
    id: number;
    name: string;
    alias?: string;
    address: string;
    coordinates: { lat: number; lon: number };
    lastUpdated: number;
  };
  
  const [propertiesGeoCache, setPropertiesGeoCache] = useState<Map<number, PropertyGeoCache>>(new Map());
  
  // Track failed geocoding attempts per property to avoid infinite retries
  const [failedGeocodingAttempts, setFailedGeocodingAttempts] = useState<Map<number, number>>(new Map());
  const MAX_GEOCODING_ATTEMPTS = 5;

  // Geocoding queue configuration
  const GEOCODING_CONFIG = {
    BATCH_SIZE: 5,
    BATCH_DELAY: 1500,
    MAX_RETRIES: 3,
    RETRY_DELAYS: [2000, 4000, 6000]
  };
  
  type PropertyToGeocode = {
    property: AppProperty;
    priority: 'high' | 'low';
    retryCount: number;
  };
  
  const geocodingQueueRef = useRef<PropertyToGeocode[]>([]);
  const isProcessingQueueRef = useRef(false);
  const activeGeocodingRef = useRef<Map<number, Promise<{ lat: number; lon: number } | null>>>(new Map());

  // Load properties geocoding cache from localStorage
  const loadPropertiesGeocodingCache = (): Map<number, PropertyGeoCache> => {
    try {
      const saved = localStorage.getItem('properties-geocoding-cache');
      if (saved) {
        const cache = JSON.parse(saved);
        const cacheMap = new Map<number, PropertyGeoCache>();
        Object.entries(cache).forEach(([idStr, data]: [string, any]) => {
          cacheMap.set(parseInt(idStr), data as PropertyGeoCache);
        });
        return cacheMap;
      }
    } catch (err) {
      // Silent error handling
    }
    return new Map();
  };

  // Save properties geocoding cache to localStorage
  const savePropertiesGeocodingCache = (cache: Map<number, PropertyGeoCache>) => {
    try {
      const cacheObj: Record<number, PropertyGeoCache> = {};
      cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem('properties-geocoding-cache', JSON.stringify(cacheObj));
    } catch (err) {
      // Silent error handling
    }
  };

  // Check if property needs coordinate update
  const shouldUpdatePropertyCoordinates = (property: AppProperty, cachedProperty?: PropertyGeoCache): boolean => {
    if (!cachedProperty) return true; // New property
    
    // Normalize addresses for comparison
    const currentAddress = property.address?.trim().toLowerCase() || '';
    const cachedAddress = cachedProperty.address?.trim().toLowerCase() || '';
    
    return currentAddress !== cachedAddress; // Address changed
  };

  // Save property to geocoding cache
  const savePropertyToGeocodingCache = (property: AppProperty, coordinates: { lat: number; lon: number }) => {
    const cacheEntry: PropertyGeoCache = {
      id: property.id,
      name: property.name || '',
      alias: property.alias,
      address: property.address || '',
      coordinates,
      lastUpdated: Date.now()
    };
    
    const newCache = new Map(propertiesGeoCache);
    newCache.set(property.id, cacheEntry);
    setPropertiesGeoCache(newCache);
    savePropertiesGeocodingCache(newCache);
  };

  // Load properties cache from localStorage
  const loadPropertiesCache = (): { properties: AppProperty[]; timestamp: number } | null => {
    try {
      const saved = localStorage.getItem('properties-cache');
      if (saved) {
        const cache = JSON.parse(saved);
        // Check if cache is less than 1 hour old
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (cache.timestamp > oneHourAgo) {
          return cache;
        }
      }
    } catch (err) {
      console.warn('Error loading properties cache:', err);
    }
    return null;
  };

  // Save properties cache to localStorage
  const savePropertiesCache = (properties: AppProperty[]) => {
    try {
      const cache = {
        properties,
        timestamp: Date.now()
      };
      localStorage.setItem('properties-cache', JSON.stringify(cache));
    } catch (err) {
      console.warn('Error saving properties cache:', err);
    }
  };

  // Load map session state from localStorage
  const loadMapSessionState = () => {
    try {
      const saved = localStorage.getItem('map-session-state');
      if (saved) {
        const state = JSON.parse(saved);
        return {
          selectedView: state.selectedView || 'guards',
          selectedPropertyIds: new Set(state.selectedPropertyIds || []),
          propertiesSearch: state.propertiesSearch || "",
          showAllProperties: state.showAllProperties || false
        };
      }
    } catch (err) {
      console.warn('Error loading map session state:', err);
    }
    return {
      selectedView: 'guards' as 'guards' | 'properties',
      selectedPropertyIds: new Set<number>(),
      propertiesSearch: "",
      showAllProperties: false
    };
  };

  // Save map session state to localStorage
  const saveMapSessionState = () => {
    try {
      const state = {
        selectedView,
        selectedPropertyIds: Array.from(selectedPropertyIds),
        propertiesSearch,
        showAllProperties
      };
      localStorage.setItem('map-session-state', JSON.stringify(state));
    } catch (err) {
      console.warn('Error saving map session state:', err);
    }
  };

  // Geocode a single property with retry logic
  const geocodeSingleProperty = async (property: AppProperty, retryCount = 0): Promise<{ lat: number; lon: number } | null> => {
    const MAX_RETRIES = GEOCODING_CONFIG.MAX_RETRIES;
    
    // Check if this property has already failed too many times
    const currentAttempts = failedGeocodingAttempts.get(property.id) || 0;
    if (currentAttempts >= MAX_GEOCODING_ATTEMPTS) {
      console.warn(`Property ${property.id} has failed geocoding ${currentAttempts} times, skipping`);
      return null;
    }
    
    // Check if already being geocoded
    const existingRequest = activeGeocodingRef.current.get(property.id);
    if (existingRequest) {
      return existingRequest;
    }

    const geocodingPromise = (async () => {
      try {
        const address = property.address || '';
        if (!address.trim()) return null;

        const suggestions = await addressAutocompleteService.searchAddresses(address, 'us');
        
        if (suggestions.length > 0) {
          const bestMatch = suggestions[0];
          const lat = parseFloat(bestMatch.lat);
          const lon = parseFloat(bestMatch.lon);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            const coordinates = { lat, lon };
            
            // Success - reset failed attempts counter
            setFailedGeocodingAttempts(prev => {
              const newMap = new Map(prev);
              newMap.delete(property.id);
              return newMap;
            });
            
            // Save to cache
            savePropertyToGeocodingCache(property, coordinates);
            
            return coordinates;
          }
        }
        
        // No results - retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const delay = GEOCODING_CONFIG.RETRY_DELAYS[retryCount] || 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          activeGeocodingRef.current.delete(property.id);
          return geocodeSingleProperty(property, retryCount + 1);
        }
        
        // Failed after all retries - increment failed attempts counter
        setFailedGeocodingAttempts(prev => {
          const newMap = new Map(prev);
          newMap.set(property.id, currentAttempts + 1);
          return newMap;
        });
        
        return null;
      } catch (error) {
        // Error - retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const delay = GEOCODING_CONFIG.RETRY_DELAYS[retryCount] || 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          activeGeocodingRef.current.delete(property.id);
          return geocodeSingleProperty(property, retryCount + 1);
        }
        
        // Failed after all retries - increment failed attempts counter
        setFailedGeocodingAttempts(prev => {
          const newMap = new Map(prev);
          newMap.set(property.id, currentAttempts + 1);
          return newMap;
        });
        
        return null;
      } finally {
        activeGeocodingRef.current.delete(property.id);
      }
    })();

    activeGeocodingRef.current.set(property.id, geocodingPromise);
    return geocodingPromise;
  };

  // Process geocoding queue in batches
  const processGeocodingQueue = async () => {
    if (isProcessingQueueRef.current || geocodingQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    try {
      while (geocodingQueueRef.current.length > 0) {
        // Get next batch
        const batch = geocodingQueueRef.current.splice(0, GEOCODING_CONFIG.BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(item => 
          geocodeSingleProperty(item.property, item.retryCount)
        );
        
        await Promise.all(batchPromises);
        
        // Delay before next batch (if there are more items)
        if (geocodingQueueRef.current.length > 0) {
          await new Promise(resolve => setTimeout(resolve, GEOCODING_CONFIG.BATCH_DELAY));
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  // Add properties to geocoding queue
  const addToGeocodingQueue = (properties: AppProperty[], priority: 'high' | 'low' = 'low') => {
    const itemsToAdd: PropertyToGeocode[] = properties.map(property => ({
      property,
      priority,
      retryCount: 0
    }));

    if (priority === 'high') {
      // High priority items go to the front
      geocodingQueueRef.current.unshift(...itemsToAdd);
    } else {
      // Low priority items go to the back
      geocodingQueueRef.current.push(...itemsToAdd);
    }

    // Start processing
    processGeocodingQueue();
  };

  // Get coordinates for a property (cache-first, then geocode)
  const getPropertyCoordinates = async (property: AppProperty, priority: 'high' | 'low' = 'low'): Promise<{ lat: number; lon: number } | null> => {
    // Check cache first
    const cached = propertiesGeoCache.get(property.id);
    
    if (cached && !shouldUpdatePropertyCoordinates(property, cached)) {
      // Cache hit and address hasn't changed - return immediately
      return cached.coordinates;
    }

    // Cache miss or address changed
    if (priority === 'high') {
      // High priority - geocode immediately
      return geocodeSingleProperty(property);
    } else {
      // Low priority - add to queue
      addToGeocodingQueue([property], priority);
      
      // Return cached coordinates if available (even if address might have changed)
      // The queue will update it in the background
      return cached?.coordinates || null;
    }
  };

  // Load saved map position from localStorage
  const loadSavedMapPosition = () => {
    try {
      const saved = localStorage.getItem('map-position');
      if (saved) {
        const position = JSON.parse(saved);
        return {
          center: position.center || defaultCenter,
          zoom: position.zoom || initialZoom
        };
      }
    } catch (err) {
      console.warn('Error loading saved map position:', err);
    }
    return { center: defaultCenter, zoom: initialZoom };
  };

  // Save map position to localStorage
  const saveMapPosition = (mapCenter: [number, number], mapZoom: number) => {
    try {
      localStorage.setItem('map-position', JSON.stringify({
        center: mapCenter,
        zoom: mapZoom
      }));
    } catch (err) {
      console.warn('Error saving map position:', err);
    }
  };

  // Normalize service -> local type
  function normalize(loc: ServiceGuardLocation): GuardLocationType {
    return {
      guardId: loc.guardId,
      lat: Number(loc.lat),
      lon: Number(loc.lon),
      isOnShift: Boolean(loc.isOnShift),
      lastUpdated: loc.lastUpdated ?? "",
      propertyId: loc.propertyId ?? null,
      propertyName: loc.propertyName ?? null,
      name: loc.name ?? null,
      phone: loc.phone ?? null,
    };
  }

  // init leaflet map once
  useEffect(() => {
    ensureIconFix();
    if (!mapRef.current) return;

    const savedPosition = loadSavedMapPosition();

    leafletMapRef.current = L.map(mapRef.current, {
      center: savedPosition.center,
      zoom: savedPosition.zoom,
      zoomControl: false,
      // Improve performance
      preferCanvas: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      // Smooth zoom
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });

    // Define base layers (street view and satellite view)
    const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 8,
      tileSize: 256,
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 200,
      crossOrigin: true,
      detectRetina: window.devicePixelRatio > 1,
      errorTileUrl: '',
      className: 'map-tiles',
    });

    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 8,
      tileSize: 256,
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 200,
      crossOrigin: true,
      detectRetina: window.devicePixelRatio > 1,
      errorTileUrl: '',
      className: 'map-tiles',
    });

    // Add default layer (street)
    streetLayer.addTo(leafletMapRef.current);

    // Create custom layer switcher control (bottom-left, Google Maps style)
    const LayerSwitcher = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '10px 16px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        container.style.cursor = 'pointer';
        container.style.fontSize = '14px';
        container.style.fontWeight = '500';
        container.style.minWidth = '100px';
        container.style.textAlign = 'center';
        container.style.transition = 'background-color 0.2s';
        container.innerHTML = '🗺️ Calles';
        
        let currentLayer = 'street';
        
        // Hover effect
        container.onmouseenter = function() {
          container.style.backgroundColor = '#f5f5f5';
        };
        container.onmouseleave = function() {
          container.style.backgroundColor = 'white';
        };
        
        container.onclick = function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          
          if (currentLayer === 'street') {
            leafletMapRef.current?.removeLayer(streetLayer);
            satelliteLayer.addTo(leafletMapRef.current!);
            container.innerHTML = '🛰️ Satélite';
            currentLayer = 'satellite';
          } else {
            leafletMapRef.current?.removeLayer(satelliteLayer);
            streetLayer.addTo(leafletMapRef.current!);
            container.innerHTML = '🗺️ Calles';
            currentLayer = 'street';
          }
        };
        
        return container;
      }
    });

    new LayerSwitcher().addTo(leafletMapRef.current);

    // Create custom zoom control (bottom-right, Google Maps style)
    const ZoomControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-control-zoom');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '2px';
        
        // Zoom in button
        const zoomInBtn = L.DomUtil.create('button', 'leaflet-control-zoom-in', container);
        zoomInBtn.innerHTML = '+';
        zoomInBtn.style.width = '40px';
        zoomInBtn.style.height = '40px';
        zoomInBtn.style.border = 'none';
        zoomInBtn.style.borderRadius = '50%';
        zoomInBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        zoomInBtn.style.backdropFilter = 'blur(4px)';
        zoomInBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        zoomInBtn.style.cursor = 'pointer';
        zoomInBtn.style.fontSize = '18px';
        zoomInBtn.style.fontWeight = 'bold';
        zoomInBtn.style.color = '#333';
        zoomInBtn.style.display = 'flex';
        zoomInBtn.style.alignItems = 'center';
        zoomInBtn.style.justifyContent = 'center';
        zoomInBtn.style.transition = 'background-color 0.2s';
        
        zoomInBtn.onmouseenter = function() {
          zoomInBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        };
        zoomInBtn.onmouseleave = function() {
          zoomInBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        };
        
        zoomInBtn.onclick = function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          leafletMapRef.current?.zoomIn();
        };
        
        // Zoom out button
        const zoomOutBtn = L.DomUtil.create('button', 'leaflet-control-zoom-out', container);
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.style.width = '40px';
        zoomOutBtn.style.height = '40px';
        zoomOutBtn.style.border = 'none';
        zoomOutBtn.style.borderRadius = '50%';
        zoomOutBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        zoomOutBtn.style.backdropFilter = 'blur(4px)';
        zoomOutBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        zoomOutBtn.style.cursor = 'pointer';
        zoomOutBtn.style.fontSize = '18px';
        zoomOutBtn.style.fontWeight = 'bold';
        zoomOutBtn.style.color = '#333';
        zoomOutBtn.style.display = 'flex';
        zoomOutBtn.style.alignItems = 'center';
        zoomOutBtn.style.justifyContent = 'center';
        zoomOutBtn.style.transition = 'background-color 0.2s';
        
        zoomOutBtn.onmouseenter = function() {
          zoomOutBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        };
        zoomOutBtn.onmouseleave = function() {
          zoomOutBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        };
        
        zoomOutBtn.onclick = function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          leafletMapRef.current?.zoomOut();
        };
        
        return container;
      }
    });

    new ZoomControl().addTo(leafletMapRef.current);
    const savePositionOnChange = () => {
      if (leafletMapRef.current) {
        const center = leafletMapRef.current.getCenter();
        const zoom = leafletMapRef.current.getZoom();
        saveMapPosition([center.lat, center.lng], zoom);
      }
    };

    leafletMapRef.current.on('moveend', savePositionOnChange);
    leafletMapRef.current.on('zoomend', savePositionOnChange);

    return () => {
      try {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      } catch (err) {
        // evitar bloque vacío; loguear por si hace falta depurar
         
        console.warn("error removing leaflet map:", err);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Utilities for marker popup (dot + bold name + phone)
  function markerPopupHtml(loc: GuardLocationType) {
    const last = loc.lastUpdated ? new Date(loc.lastUpdated).toLocaleString() : "—";
    const dot = dotHtml(loc.isOnShift);
    const boldName = boldNameHtml(loc.name, loc.guardId);
    const property = escapeHtml(loc.propertyName ?? "Sin propiedad");
    const phoneHtml =
      loc.phone && String(loc.phone).trim() !== ""
        ? `<div style="font-size:12px;margin-top:4px;"><a href="tel:${escapeHtml(loc.phone)}">${escapeHtml(loc.phone)}</a></div>`
        : "";

    return `
      <div style="font-size:13px;">
        <div style="margin-bottom:6px;">
          ${dot}${boldName}
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:4px;">${property}</div>
        ${phoneHtml}
        <div style="font-size:12px;color:#777;margin-top:4px;">Última: ${escapeHtml(last)}</div>
        <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}">Abrir en Maps</a></div>
      </div>
    `;
  }

  // add/update/remove markers
  function upsertMarkers(newLocations: GuardLocationType[]) {
    const map = leafletMapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const seen = new Set<number>();

    for (const loc of newLocations) {
      seen.add(loc.guardId);
      const existingMarker = existing.get(loc.guardId);
      const latlng = L.latLng(loc.lat, loc.lon);

      if (existingMarker) {
        // update marker position and popup
        existingMarker.setLatLng(latlng);
        existingMarker.setPopupContent(markerPopupHtml(loc));
      } else {
        const marker = L.marker(latlng);
        marker.bindPopup(markerPopupHtml(loc));
        // cuando hacen click en el marker, seguimos a ese guard
        marker.on("click", () => {
          setFollowGuardId(loc.guardId);
          // abrir popup y centrar suavemente
          marker.openPopup();
          try {
            leafletMapRef.current?.setView([loc.lat, loc.lon], 15);
          } catch (err) {
            // evitar bloque vacío; registrar por si hay problema con setView
             
            console.warn("leaflet setView error:", err);
          }
        });
        marker.addTo(map);
        existing.set(loc.guardId, marker);
      }
    }

    // remove markers not present anymore & clean listeners
    for (const id of Array.from(existing.keys())) {
      if (!seen.has(id)) {
        const m = existing.get(id);
        if (m) {
          try {
            const offFn = (m as unknown as L.Evented).off;
            if (typeof offFn === "function") {
              (offFn as (...args: unknown[]) => unknown).call(m, "click");
            }
            m.remove();
          } catch (err) {
            // no queremos bloquear si algo falla removiendo un marker; registrar
             
            console.warn("Error removing marker:", err);
          }
        }
        existing.delete(id);
      }
    }
  }

  // Clear all property markers from map
  function clearAllPropertyMarkers() {
    const map = leafletMapRef.current;
    if (!map) return;

    // Clear individual property marker
    if (propertyMarkerRef.current) {
      try {
        propertyMarkerRef.current.remove();
        propertyMarkerRef.current = null;
      } catch (err) {
        console.warn("Error removing property marker:", err);
      }
    }

    // Clear all "show all" and "selected" property markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const element = (layer as any).getElement?.();
        if (element && (element.classList.contains('all-properties-marker') || element.classList.contains('selected-property-marker'))) {
          try {
            layer.remove();
          } catch (err) {
            console.warn("Error removing property marker:", err);
          }
        }
      }
    });
  }

  // add/update property marker
  function upsertPropertyMarker(pin?: { address: string; name?: string; lat?: number; lon?: number }) {
    const map = leafletMapRef.current;
    if (!map || !pin) return;

    // Remove existing property marker
    if (propertyMarkerRef.current) {
      try {
        propertyMarkerRef.current.remove();
        propertyMarkerRef.current = null;
      } catch (err) {
        console.warn("Error removing property marker:", err);
      }
    }

    // Create new property marker if we have coordinates
    if (pin.lat && pin.lon) {
      const latlng = L.latLng(pin.lat, pin.lon);
      const propertyIcon = L.divIcon({
        html: '<div style="background-color: #dc2626; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; background-color: white; border-radius: 50%;"></div></div>',
        className: 'property-marker',
        iconSize: [25, 25],
        iconAnchor: [12, 25]
      });

      const marker = L.marker(latlng, { icon: propertyIcon });
      const popupContent = `
        <div style="font-size:13px;">
          <div style="margin-bottom:6px;">
            <strong style="font-weight:600;">🏠 ${escapeHtml(pin.name || 'Propiedad')}</strong>
          </div>
          <div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(pin.address)}</div>
          <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lon}">Abrir en Maps</a></div>
        </div>
      `;
      marker.bindPopup(popupContent);
      marker.addTo(map);
      propertyMarkerRef.current = marker;

      // Center map on property only if it's a new property pin (not on initial load)
      // The map now maintains its saved position, so we only center on property when explicitly requested
      if (pin.lat && pin.lon) {
        try {
          // Only center if this is a new property pin navigation (not initial map load)
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();
          const isDefaultPosition = 
            Math.abs(currentCenter.lat - defaultCenter[0]) < 0.001 && 
            Math.abs(currentCenter.lng - defaultCenter[1]) < 0.001 && 
            currentZoom === initialZoom;

          if (isDefaultPosition) {
            map.setView([pin.lat, pin.lon], 15);
          }
        } catch (err) {
          console.warn("setView error on property:", err);
        }
      }
    }
  }

  // load and set locations
  async function loadLocations() {
    setError(null);
    try {
      const { locations: locs } = await getCachedGuardLocations();
      const normalized = locs.map(normalize);
      setLocations(normalized);
      upsertMarkers(normalized);

      // si estamos siguiendo un guard, centrar en él
      if (followGuardId) {
        const focus = normalized.find((l) => l.guardId === followGuardId);
        if (focus && leafletMapRef.current) {
          try {
            leafletMapRef.current.setView([focus.lat, focus.lon]);
          } catch (err) {
             
            console.warn("setView error on follow:", err);
          }
        }
      }
    } catch (err) {
      // Mostrar error y no dejar que el UI se bloquee
       
      console.error("Error cargando cached locations:", err);
      setError((err as Error)?.message ?? String(err ?? "Error desconocido"));
    }
  }

  // load properties
  async function loadProperties() {
    setPropertiesError(null);
    
    // First try to load from cache
    const cached = loadPropertiesCache();
    if (cached) {
      setProperties(cached.properties);
    }
    
    try {
      const result = await listProperties(1, "", 100);
      setProperties(result.items);
      savePropertiesCache(result.items);
    } catch (err) {
      // If we don't have cached data, show the error
      if (!cached) {
        setPropertiesError((err as Error)?.message ?? String(err ?? "Error desconocido"));
      }
    }
  }

  useEffect(() => {
    // initial load + polling
    loadLocations();
    if (pollIntervalMs > 0) {
      const id = window.setInterval(() => {
        loadLocations();
      }, pollIntervalMs);
      intervalRef.current = id;
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs, followGuardId]);

  // Load properties when view changes to properties
  useEffect(() => {
    if (selectedView === 'properties') {
      loadProperties();
      // Clear guard markers when switching to properties view
      upsertMarkers([]);
      setFollowGuardId(null);
    } else {
      // Clear property marker when switching to guards view
      upsertPropertyMarker(undefined);
      setSelectedPropertyIds(new Set());
      // Reload guard locations
      loadLocations();
    }
  }, [selectedView]);

  // Handle show/hide all properties on map
  const handleToggleShowAllProperties = async () => {
    const filteredProperties = getFilteredProperties();

    if (showAllProperties) {
      // Hide all properties
      setShowAllProperties(false);
      setSelectedPropertyIds(new Set());
      // Clear all property markers
      clearAllPropertyMarkers();
    } else {
      // Show all filtered properties
      setShowAllProperties(true);
      // Select all filtered properties
      const newSelectedIds = new Set(selectedPropertyIds);
      filteredProperties.forEach(property => newSelectedIds.add(property.id));
      setSelectedPropertyIds(newSelectedIds);
      
      // Identify properties that need geocoding
      const propertiesToGeocode: AppProperty[] = [];
      const cachedCoords: { lat: number; lon: number }[] = [];
      
      filteredProperties.forEach(property => {
        const cached = propertiesGeoCache.get(property.id);
        
        if (cached && !shouldUpdatePropertyCoordinates(property, cached)) {
          // Use cached coordinates
          cachedCoords.push(cached.coordinates);
        } else if (property.address && property.address.trim() !== "") {
          // Need to geocode
          propertiesToGeocode.push(property);
        }
      });
      
      // Add properties that need geocoding to queue (low priority - batch processing)
      if (propertiesToGeocode.length > 0) {
        addToGeocodingQueue(propertiesToGeocode, 'low');
      }
      
      // Show markers for cached properties immediately
      filteredProperties.forEach(property => {
        const cached = propertiesGeoCache.get(property.id);
        
        if (cached && !shouldUpdatePropertyCoordinates(property, cached)) {
          const coords = cached.coordinates;
          
          const propertyIcon = L.divIcon({
            html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div></div>',
            className: 'all-properties-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
          });

          const marker = L.marker([coords.lat, coords.lon], { icon: propertyIcon });
          const popupContent = `
            <div style="font-size:13px;">
              <div style="margin-bottom:6px;">
                <strong style="font-weight:600;">🏠 ${escapeHtml(property.name || `Property #${property.id}`)}</strong>
              </div>
              <div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(property.address || '')}</div>
              <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}">Abrir en Maps</a></div>
            </div>
          `;
          marker.bindPopup(popupContent);
          marker.addTo(leafletMapRef.current!);
        }
      });
      
      // Adjust map view based on cached coordinates
      if (leafletMapRef.current && cachedCoords.length > 0) {
        try {
          if (cachedCoords.length === 1) {
            // Single property: center on it
            leafletMapRef.current.setView([cachedCoords[0].lat, cachedCoords[0].lon], 15);
          } else {
            // Multiple properties: fit bounds to show all
            const bounds = L.latLngBounds(cachedCoords.map(coord => [coord.lat, coord.lon]));
            leafletMapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (err) {
          console.warn("Error adjusting map view for filtered properties:", err);
        }
      }
    }
  };

  // Handle property click to show on map (multiple selection)
  const handlePropertyClick = async (property: AppProperty) => {
    const newSelectedIds = new Set(selectedPropertyIds);
    
    if (newSelectedIds.has(property.id)) {
      // Remove from selection
      newSelectedIds.delete(property.id);
    } else {
      // Add to selection
      newSelectedIds.add(property.id);
    }
    
    setSelectedPropertyIds(newSelectedIds);
    
    // If no properties selected, clear markers
    if (newSelectedIds.size === 0) {
      clearAllPropertyMarkers();
      return;
    }

    // Show markers for all selected properties
    const selectedProperties = Array.from(newSelectedIds)
      .map(id => properties.find(p => p.id === id))
      .filter((p): p is AppProperty => p !== undefined && !!p.address?.trim());
    
    // Clear existing markers first
    clearAllPropertyMarkers();
    
    const coords: { lat: number; lon: number }[] = [];
    
    // Process each selected property
    for (const selectedProperty of selectedProperties) {
      const isLastProperty = selectedProperty.id === property.id;
      const priority = isLastProperty ? 'high' : 'low';
      
      // Get coordinates (cache-first, then geocode if needed)
      const propertyCoords = await getPropertyCoordinates(selectedProperty, priority);
      
      if (propertyCoords) {
        coords.push(propertyCoords);
        
        const propertyIcon = L.divIcon({
          html: '<div style="background-color: #dc2626; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; background-color: white; border-radius: 50%;"></div></div>',
          className: 'selected-property-marker',
          iconSize: [25, 25],
          iconAnchor: [12, 25]
        });

        const marker = L.marker([propertyCoords.lat, propertyCoords.lon], { icon: propertyIcon });
        const popupContent = `
          <div style="font-size:13px;">
            <div style="margin-bottom:6px;">
              <strong style="font-weight:600;">🏠 ${escapeHtml(selectedProperty.name || `Property #${selectedProperty.id}`)}</strong>
            </div>
            <div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(selectedProperty.address || '')}</div>
            <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${propertyCoords.lat},${propertyCoords.lon}">Abrir en Maps</a></div>
          </div>
        `;
        marker.bindPopup(popupContent);
        marker.addTo(leafletMapRef.current!);
      }
    }
    
    // Adjust map view based on selected properties
    if (leafletMapRef.current && coords.length > 0) {
      try {
        if (coords.length === 1) {
          // Single property: center on it
          leafletMapRef.current.setView([coords[0].lat, coords[0].lon], 15);
        } else {
          // Multiple properties: fit bounds to show all
          const bounds = L.latLngBounds(coords.map(coord => [coord.lat, coord.lon]));
          leafletMapRef.current.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (err) {
        console.warn("Error adjusting map view:", err);
      }
    }
  };

  // Load geocoding cache on component mount
  useEffect(() => {
    // Load properties geocoding cache
    const loadedCache = loadPropertiesGeocodingCache();
    setPropertiesGeoCache(loadedCache);
    
    // Load session state
    const sessionState = loadMapSessionState();
    setSelectedView(sessionState.selectedView);
    setSelectedPropertyIds(sessionState.selectedPropertyIds as Set<number>);
    setPropertiesSearch(sessionState.propertiesSearch);
    setShowAllProperties(sessionState.showAllProperties);
    
    // Load properties cache if available
    const propertiesCache = loadPropertiesCache();
    if (propertiesCache) {
      setProperties(propertiesCache.properties);
    }
    
    // Apply initial view logic after state is loaded
    setTimeout(() => {
      if (sessionState.selectedView === 'properties') {
        loadProperties();
        upsertMarkers([]);
        setFollowGuardId(null);
      } else {
        upsertPropertyMarker(undefined);
        setSelectedPropertyIds(new Set());
        loadLocations();
      }
    }, 0);
  }, []);

  // Save session state when it changes
  useEffect(() => {
    saveMapSessionState();
  }, [selectedView, selectedPropertyIds, propertiesSearch, showAllProperties]);

  // computed current followed guard info
  const currentFollow = locations.find((l) => l.guardId === followGuardId) ?? null;

  // Get filtered properties based on search
  const getFilteredProperties = () => {
    const searchTerm = propertiesSearch.toLowerCase();
    return properties.filter((property) =>
      (property.name ?? "").toLowerCase().includes(searchTerm) ||
      (property.alias ?? "").toLowerCase().includes(searchTerm)
    );
  };

  const filteredProperties = getFilteredProperties();
  const allFilteredPropertiesSelected = filteredProperties.length > 0 && 
    filteredProperties.every(property => selectedPropertyIds.has(property.id));

  // Auto-update showAllProperties when all filtered properties are selected
  useEffect(() => {
    // Only update if we're not in "show all" mode and all filtered properties are selected
    if (!showAllProperties && allFilteredPropertiesSelected && filteredProperties.length > 0) {
      setShowAllProperties(true);
    }
    // Don't auto-disable showAllProperties when individual properties are deselected
    // Let the user manually control the "show all" state
  }, [allFilteredPropertiesSelected, showAllProperties, filteredProperties.length]);

  // Update markers when properties geocoding cache changes (for background updates)
  useEffect(() => {
    if (selectedView !== 'properties' || selectedPropertyIds.size === 0) return;
    
    // Re-render markers for selected properties when cache updates
    const selectedProperties = Array.from(selectedPropertyIds)
      .map(id => properties.find(p => p.id === id))
      .filter((p): p is AppProperty => p !== undefined);
    
    selectedProperties.forEach(property => {
      const cached = propertiesGeoCache.get(property.id);
      if (cached) {
        // Find existing marker and update if needed
        // This ensures newly geocoded properties appear on the map
        const existingMarkers = document.querySelectorAll(`.selected-property-marker, .all-properties-marker`);
        const hasMarkerForProperty = Array.from(existingMarkers).some(marker => {
          const popup = (marker as any).__leaflet_marker?.getPopup();
          return popup && popup.getContent().includes(`Property #${property.id}`);
        });
        
        if (!hasMarkerForProperty) {
          // Add marker for newly geocoded property
          const coords = cached.coordinates;
          const isShowAll = showAllProperties;
          const markerClass = isShowAll ? 'all-properties-marker' : 'selected-property-marker';
          const markerColor = isShowAll ? '#3b82f6' : '#dc2626';
          const markerSize = isShowAll ? 20 : 25;
          
          const propertyIcon = L.divIcon({
            html: `<div style="background-color: ${markerColor}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: ${isShowAll ? 2 : 3}px; left: ${isShowAll ? 2 : 3}px; width: ${isShowAll ? 12 : 15}px; height: ${isShowAll ? 12 : 15}px; background-color: white; border-radius: 50%;"></div></div>`,
            className: markerClass,
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize]
          });

          const marker = L.marker([coords.lat, coords.lon], { icon: propertyIcon });
          const popupContent = `
            <div style="font-size:13px;">
              <div style="margin-bottom:6px;">
                <strong style="font-weight:600;">🏠 ${escapeHtml(property.name || `Property #${property.id}`)}</strong>
              </div>
              <div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(property.address || '')}</div>
              <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}">Abrir en Maps</a></div>
            </div>
          `;
          marker.bindPopup(popupContent);
          marker.addTo(leafletMapRef.current!);
        }
      }
    });
  }, [propertiesGeoCache, selectedPropertyIds, selectedView, showAllProperties, properties]);

  return (
    <div className="w-full h-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedView} onValueChange={(value: 'guards' | 'properties') => setSelectedView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guards">Guardias</SelectItem>
              <SelectItem value="properties">Propiedades</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => selectedView === 'guards' ? loadLocations() : loadProperties()}
          >
            Refrescar
          </Button>
          {selectedView === 'guards' && (
            <Button variant="ghost" onClick={() => setFollowGuardId(null)}>Quitar follow</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="col-span-1 bg-white rounded-md shadow-sm p-3 h-[70vh] flex flex-col">
          {selectedView === 'guards' ? (
            <>
              {/* Guards view header */}
              <div className="flex-shrink-0 mb-3">
                <div className="text-sm font-medium mb-2">Guardias Activos ({locations.length})</div>
                {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
              </div>

              {/* Scrollable guards list */}
              <div className="flex-1 overflow-auto">
                <ul className="space-y-2">
                  {locations.map((location) => (
                    <li key={location.guardId} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${location.isOnShift ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
                            <span className="font-medium text-sm">
                              {location.name && String(location.name).trim() !== "" ? location.name : `ID #${location.guardId}`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {location.propertyName ?? "Sin propiedad asignada"}
                          </div>
                          {location.phone && String(location.phone).trim() !== "" && (
                            <div className="text-xs text-muted-foreground">
                              <a href={`tel:${location.phone}`} className="underline">{location.phone}</a>
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <Button
                            size="sm"
                            variant={followGuardId === location.guardId ? "default" : "outline"}
                            onClick={() => setFollowGuardId(followGuardId === location.guardId ? null : location.guardId)}
                            className="text-xs px-3"
                            title={followGuardId === location.guardId ? "Dejar de seguir" : "Seguir en mapa"}
                          >
                            {followGuardId === location.guardId ? "Siguiendo" : "Seguir"}
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Fixed header with search and show all button */}
              <div className="flex-shrink-0 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Buscar propiedades..."
                      value={propertiesSearch}
                      onChange={(e) => setPropertiesSearch(e.target.value)}
                      className="pr-8"
                    />
                    {propertiesSearch.trim() && (
                      <button
                        onClick={() => setPropertiesSearch('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={showAllProperties ? "default" : "outline"}
                    onClick={handleToggleShowAllProperties}
                    className="text-xs whitespace-nowrap"
                  >
                    <MapIcon className="w-3 h-3 mr-1" />
                    {showAllProperties ? "Ocultar todas" : "Mostrar todas"}
                  </Button>
                </div>
                {propertiesError && <div className="text-sm text-red-600 mb-2">Error: {propertiesError}</div>}
              </div>

              {/* Scrollable properties list */}
              <div className="flex-1 overflow-auto">
                <ul className="space-y-2">
                  {properties
                    .filter((property) => {
                      const searchTerm = propertiesSearch.toLowerCase();
                      return (
                        (property.name ?? "").toLowerCase().includes(searchTerm) ||
                        (property.alias ?? "").toLowerCase().includes(searchTerm)
                      );
                    })
                    .map((property) => (
                      <li key={property.id} className="p-3 border rounded flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {property.name || `Propiedad #${property.id}`}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {property.address}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <Button
                            size="sm"
                            variant={selectedPropertyIds.has(property.id) ? "default" : "outline"}
                            onClick={() => handlePropertyClick(property)}
                            className="text-xs px-3"
                            title="Ver en mapa"
                          >
                            <MapIcon className="w-3 h-3 mr-1" />
                            {selectedPropertyIds.has(property.id) ? "En mapa" : "Ver mapa"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`, "_blank");
                            }}
                            className="text-xs px-3"
                            title="Abrir en Google Maps"
                          >
                            <MapIcon className="w-3 h-3 mr-1" />
                            Google Maps
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Map container with top overlay showing "<guard name> - <property name>" */}
        <div className="col-span-3 bg-white rounded-md shadow-sm p-2 h-[70vh]">
          <div className="relative w-full h-full">
            {/* Top overlay */}
            <div className="absolute top-3 left-3 z-50">
              <div className="bg-white/90 backdrop-blur-sm border rounded-md px-3 py-2 shadow-sm flex items-center gap-3">
                {selectedView === 'guards' ? (
                  currentFollow ? (
                    <>
                      <div className="flex items-center gap-3">
                        {/* puntito + nombre en negrita */}
                        <span className={`inline-block w-3 h-3 rounded-full ${currentFollow.isOnShift ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
                        <div className="text-sm font-medium">
                          {currentFollow.name && String(currentFollow.name).trim() !== "" ? (
                            <span className="font-semibold">{currentFollow.name}</span>
                          ) : (
                            <span className="font-semibold">ID #{currentFollow.guardId}</span>
                          )}
                          <span className="text-muted-foreground"> {" - "} {currentFollow.propertyName ?? "Sin propiedad"}</span>
                          {currentFollow.phone && String(currentFollow.phone).trim() !== "" && (
                            <div className="text-xs text-muted-foreground">{currentFollow.phone}</div>
                          )}
                        </div>
                      </div>
                      <div className="ml-2">
                        <Button size="sm" variant="ghost" onClick={() => setFollowGuardId(null)}>
                          Quitar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No hay un guard seleccionado</div>
                  )
                ) : (
                  selectedPropertyIds.size > 0 ? (
                    (() => {
                      const selectedProperties = properties.filter(p => selectedPropertyIds.has(p.id));
                      return selectedProperties.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            {selectedProperties.length === 1 ? (
                              <>
                                <span className="font-semibold">🏠 {selectedProperties[0].name || `Propiedad #${selectedProperties[0].id}`}</span>
                                <div className="text-xs text-muted-foreground">{selectedProperties[0].address}</div>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">{selectedProperties.length} propiedades seleccionadas</span>
                                <div className="text-xs text-muted-foreground">
                                  {selectedProperties.slice(0, 2).map(p => p.name || `Propiedad #${p.id}`).join(', ')}
                                  {selectedProperties.length > 2 && ` y ${selectedProperties.length - 2} más`}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="ml-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setSelectedPropertyIds(new Set());
                              clearAllPropertyMarkers();
                            }}>
                              Quitar todas
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Propiedades no encontradas</div>
                      );
                    })()
                  ) : (
                    <div className="text-sm text-muted-foreground">Selecciona una o más propiedades del panel lateral</div>
                  )
                )}
              </div>
            </div>

            {/* Map DOM node */}
            <div ref={mapRef as MutableRefObject<HTMLDivElement | null>} className="w-full h-full" style={{ minHeight: 400 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
