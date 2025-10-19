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
  propertyPin?: {
    address: string;
    name?: string;
    lat?: number;
    lon?: number;
  };
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
    // eslint-disable-next-line no-console
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
  propertyPin,
}: MapPageProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const propertyMarkerRef = useRef<L.Marker | null>(null);
  const [locations, setLocations] = useState<GuardLocationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followGuardId, setFollowGuardId] = useState<number | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const [selectedView, setSelectedView] = useState<'guards' | 'properties'>('guards');
  const [properties, setProperties] = useState<AppProperty[]>([]);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [propertiesSearch, setPropertiesSearch] = useState("");

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
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(leafletMapRef.current);

    // Save position when map moves or zooms
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
          leafletMapRef.current.off('moveend', savePositionOnChange);
          leafletMapRef.current.off('zoomend', savePositionOnChange);
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      } catch (err) {
        // evitar bloque vacío; loguear por si hace falta depurar
        // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
            console.warn("Error removing marker:", err);
          }
        }
        existing.delete(id);
      }
    }
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
    setLoading(true);
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
            // eslint-disable-next-line no-console
            console.warn("setView error on follow:", err);
          }
        }
      }
    } catch (err) {
      // Mostrar error y no dejar que el UI se bloquee
      // eslint-disable-next-line no-console
      console.error("Error cargando cached locations:", err);
      setError((err as Error)?.message ?? String(err ?? "Error desconocido"));
    } finally {
      setLoading(false);
    }
  }

  // load properties
  async function loadProperties() {
    setPropertiesError(null);
    try {
      const result = await listProperties(1, "", 100); // Load first page with up to 100 properties
      setProperties(result.items);
    } catch (err) {
      console.error("Error cargando properties:", err);
      setPropertiesError((err as Error)?.message ?? String(err ?? "Error desconocido"));
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
      setSelectedPropertyId(null);
      // Reload guard locations
      loadLocations();
    }
  }, [selectedView]);

  // Handle show/hide all properties on map
  const handleToggleShowAllProperties = () => {
    const filteredProperties = properties.filter((property) => {
      const searchTerm = propertiesSearch.toLowerCase();
      return (
        (property.name ?? "").toLowerCase().includes(searchTerm) ||
        (property.alias ?? "").toLowerCase().includes(searchTerm)
      );
    });

    if (showAllProperties) {
      // Hide all properties
      setShowAllProperties(false);
      setSelectedPropertyId(null);
      // Clear all property markers
      upsertPropertyMarker(undefined);
    } else {
      // Show all filtered properties
      setShowAllProperties(true);
      setSelectedPropertyId(null); // Clear individual selection when showing all
      // Add markers for filtered properties
      filteredProperties.forEach(async (property) => {
        if (property.address && property.address.trim() !== "") {
          try {
            const suggestions = await addressAutocompleteService.searchAddresses(property.address, 'us');
            if (suggestions.length > 0) {
              const bestMatch = suggestions[0];
              const lat = parseFloat(bestMatch.lat);
              const lon = parseFloat(bestMatch.lon);
              
              if (!isNaN(lat) && !isNaN(lon)) {
                const propertyIcon = L.divIcon({
                  html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50% 50% 50% 0; border: 2px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div></div>',
                  className: 'all-properties-marker',
                  iconSize: [20, 20],
                  iconAnchor: [10, 20]
                });

                const marker = L.marker([lat, lon], { icon: propertyIcon });
                const popupContent = `
                  <div style="font-size:13px;">
                    <div style="margin-bottom:6px;">
                      <strong style="font-weight:600;">🏠 ${escapeHtml(property.name || `Property #${property.id}`)}</strong>
                    </div>
                    <div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(property.address)}</div>
                    <div style="margin-top:6px;"><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}">Abrir en Maps</a></div>
                  </div>
                `;
                marker.bindPopup(popupContent);
                marker.addTo(leafletMapRef.current!);
              }
            }
          } catch (error) {
            console.warn("Error geocoding property:", property.id, error);
          }
        }
      });
    }
  };

  // Handle property click to show on map
  const handlePropertyClick = async (property: AppProperty) => {
    // If this property is already selected, deselect it
    if (selectedPropertyId === property.id) {
      setSelectedPropertyId(null);
      upsertPropertyMarker(undefined);
      return;
    }

    if (!property.address || property.address.trim() === "") {
      console.warn("No address available for property:", property.id);
      return;
    }

    try {
      // Try to geocode the address
      const suggestions = await addressAutocompleteService.searchAddresses(property.address, 'us');
      
      if (suggestions.length > 0) {
        const bestMatch = suggestions[0];
        const lat = parseFloat(bestMatch.lat);
        const lon = parseFloat(bestMatch.lon);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          // Center map on property
          if (leafletMapRef.current) {
            try {
              leafletMapRef.current.setView([lat, lon], 15);
            } catch (err) {
              console.warn("setView error on property:", err);
            }
          }
          
          // Update property pin
          upsertPropertyMarker({
            address: property.address,
            name: property.name || `Property #${property.id}`,
            lat,
            lon
          });
          
          // Set selected property
          setSelectedPropertyId(property.id);
          return;
        }
      }
      
      console.warn("Could not geocode address:", property.address);
      
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };

  // Handle property pin changes
  useEffect(() => {
    upsertPropertyMarker(propertyPin);
  }, [propertyPin]);

  // computed current followed guard info
  const currentFollow = locations.find((l) => l.guardId === followGuardId) ?? null;

  // Helper renderers for JSX (sidebar & overlay)
  function renderNameWithDotJSX(loc: GuardLocationType) {
    const dotClass = loc.isOnShift ? "bg-green-500" : "bg-red-500";
    const label = loc.name && String(loc.name).trim() !== "" ? loc.name : `ID #${loc.guardId}`;
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} aria-hidden="true" />
          <span className="font-medium">{label}</span>
        </div>
        {loc.phone && String(loc.phone).trim() !== "" && (
          <div className="text-xs text-muted-foreground">
            <a href={`tel:${loc.phone}`} className="underline">{loc.phone}</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            Mapa de {selectedView === 'guards' ? 'guardias' : 'propiedades'}
          </h2>
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
        <div className="col-span-1 bg-white rounded-md shadow-sm p-3 h-[70vh] overflow-auto">
          {/* Contenido según la vista seleccionada */}
          {selectedView === 'guards' ? (
            <>
              <div className="mb-2">
                <strong>Guards (encontrados):</strong> {locations.length} {loading && <span>· cargando…</span>}
              </div>
              {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
              <ul className="space-y-2">
                {locations.map((g) => (
                  <li key={g.guardId} className="flex items-center justify-between gap-2 p-2 border rounded">
                    <div>
                      {renderNameWithDotJSX(g)}
                      <div className="text-xs text-muted-foreground">
                        {g.propertyName ?? "Sin propiedad"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Última: {g.lastUpdated ? new Date(g.lastUpdated).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button className="text-sm underline" onClick={() => {
                        setFollowGuardId(g.guardId);
                        if (leafletMapRef.current) {
                          try {
                            leafletMapRef.current.setView([g.lat, g.lon], 15);
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.warn("setView error on click follow:", err);
                          }
                        }
                        const m = markersRef.current.get(g.guardId);
                        if (m) {
                          try {
                            m.openPopup();
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.warn("openPopup error:", err);
                          }
                        }
                      }}>Seguir</button>
                      <button className="text-sm underline" onClick={() => {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lon}`, "_blank");
                      }}>Abrir en Maps</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2">
                <Input
                  placeholder="Buscar propiedades..."
                  value={propertiesSearch}
                  onChange={(e) => setPropertiesSearch(e.target.value)}
                  className="flex-1"
                />
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
                          variant={selectedPropertyId === property.id ? "default" : "outline"}
                          onClick={() => handlePropertyClick(property)}
                          className="text-xs px-3"
                          title="Ver en mapa"
                        >
                          <MapIcon className="w-3 h-3 mr-1" />
                          {selectedPropertyId === property.id ? "En mapa" : "Ver mapa"}
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
                  selectedPropertyId ? (
                    (() => {
                      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
                      return selectedProperty ? (
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            <span className="font-semibold">🏠 {selectedProperty.name || `Propiedad #${selectedProperty.id}`}</span>
                            <div className="text-xs text-muted-foreground">{selectedProperty.address}</div>
                          </div>
                          <div className="ml-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setSelectedPropertyId(null);
                              upsertPropertyMarker(undefined);
                            }}>
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Propiedad no encontrada</div>
                      );
                    })()
                  ) : (
                    <div className="text-sm text-muted-foreground">Selecciona una propiedad del panel lateral</div>
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
