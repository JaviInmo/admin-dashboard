export interface AddressSuggestion {
  display_name: string;
  place_id: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export class AddressAutocompleteService {
  private static instance: AddressAutocompleteService;
  
  public static getInstance(): AddressAutocompleteService {
    if (!AddressAutocompleteService.instance) {
      AddressAutocompleteService.instance = new AddressAutocompleteService();
    }
    return AddressAutocompleteService.instance;
  }

  /**
   * Busca direcciones usando múltiples APIs gratuitas como fallback
   * @param query - Texto de búsqueda
   * @param countryCode - Código de país (por defecto 'us')
   * @returns Promise con array de sugerencias únicas
   */
  public async searchAddresses(query: string, countryCode: string = 'us'): Promise<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const cleanQuery = query.trim();
    
    // API 1: Nominatim (OpenStreetMap) - Más confiable
    try {
      const suggestions = await this.searchWithNominatim(cleanQuery, countryCode);
      if (suggestions.length > 0) {
        return this.removeDuplicateAddresses(suggestions);
      }
    } catch (error) {
      console.warn('Nominatim API failed, trying next API...');
    }

    // API 2: Photon (Komoot) - Backup
    try {
      const suggestions = await this.searchWithPhoton(cleanQuery, countryCode);
      if (suggestions.length > 0) {
        return this.removeDuplicateAddresses(suggestions);
      }
    } catch (error) {
      console.warn('Photon API failed, trying next API...');
    }

    // API 3: MapQuest - Último recurso
    try {
      const suggestions = await this.searchWithMapQuest(cleanQuery, countryCode);
      if (suggestions.length > 0) {
        return this.removeDuplicateAddresses(suggestions);
      }
    } catch (error) {
      console.warn('MapQuest API failed...');
    }

    return [];
  }

  /**
   * Elimina direcciones duplicadas basándose en el display_name normalizado
   * @param suggestions - Array de sugerencias de direcciones
   * @returns Array de sugerencias sin duplicados
   */
  private removeDuplicateAddresses(suggestions: AddressSuggestion[]): AddressSuggestion[] {
    const seen = new Set<string>();
    const uniqueSuggestions: AddressSuggestion[] = [];

    for (const suggestion of suggestions) {
      // Normalizar la dirección para comparación (minúsculas, sin espacios extra, sin puntuación)
      const normalizedAddress = suggestion.display_name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remover puntuación
        .replace(/\s+/g, ' ')    // Múltiples espacios a uno solo
        .trim();

      if (!seen.has(normalizedAddress)) {
        seen.add(normalizedAddress);
        uniqueSuggestions.push(suggestion);
      }
    }

    return uniqueSuggestions;
  }

  private async searchWithNominatim(query: string, countryCode: string): Promise<AddressSuggestion[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=${countryCode}&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AdminDashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .filter(item => item.display_name && item.address)
      .map((item: any, index: number) => {
        const addr = item.address;
        
        // Formatear como Google Maps: número, calle, ciudad, estado, código postal, país
        const parts = [];
        
        // Número y calle
        if (addr.house_number && addr.road) {
          parts.push(`${addr.house_number}, ${addr.road}`);
        } else if (addr.road) {
          parts.push(addr.road);
        }
        
        // Ciudad
        const city = addr.city || addr.town || addr.village || addr.municipality;
        if (city) {
          parts.push(city);
        }
        
        // Estado
        if (addr.state) {
          parts.push(addr.state);
        }
        
        // Código postal
        if (addr.postcode) {
          parts.push(addr.postcode);
        }
        
        // País
        parts.push("Estados Unidos");
        
        const formattedAddress = parts.join(", ");
        
        return {
          display_name: formattedAddress,
          place_id: `nominatim_${item.place_id || index}`,
          lat: item.lat,
          lon: item.lon,
          type: item.type || "address",
          importance: item.importance || 0.5,
          address: {
            house_number: addr.house_number,
            road: addr.road,
            city: city,
            state: addr.state,
            postcode: addr.postcode,
            country: "Estados Unidos"
          }
        };
      })
      .slice(0, 5);
  }

  private async searchWithPhoton(query: string, countryCode: string): Promise<AddressSuggestion[]> {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&osm_tag=place,highway&countrycodes=${countryCode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.features || !Array.isArray(data.features) || data.features.length === 0) {
      return [];
    }

    return data.features
      .filter((feature: any) => feature.properties)
      .map((feature: any, index: number) => {
        const props = feature.properties;
        
        // Formatear como Google Maps
        const parts = [];
        
        // Número y calle
        if (props.housenumber && props.street) {
          parts.push(`${props.housenumber}, ${props.street}`);
        } else if (props.street) {
          parts.push(props.street);
        } else if (props.name) {
          parts.push(props.name);
        }
        
        // Ciudad
        if (props.city) {
          parts.push(props.city);
        }
        
        // Estado
        if (props.state) {
          parts.push(props.state);
        }
        
        // Código postal
        if (props.postcode) {
          parts.push(props.postcode);
        }
        
        // País
        parts.push("Estados Unidos");
        
        const formattedAddress = parts.join(", ");
        
        return {
          display_name: formattedAddress,
          place_id: `photon_${index}`,
          lat: feature.geometry.coordinates[1].toString(),
          lon: feature.geometry.coordinates[0].toString(),
          type: props.osm_value || "address",
          importance: 0.5,
          address: {
            house_number: props.housenumber,
            road: props.street,
            city: props.city,
            state: props.state,
            postcode: props.postcode,
            country: "Estados Unidos"
          }
        };
      })
      .slice(0, 5);
  }

  private async searchWithMapQuest(query: string, countryCode: string): Promise<AddressSuggestion[]> {
    const url = `https://www.mapquestapi.com/geocoding/v1/address?key=consumer_key&location=${encodeURIComponent(query)}&countryCode=${countryCode.toUpperCase()}&maxResults=5`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`MapQuest API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.results || !data.results[0] || !data.results[0].locations) {
      return [];
    }

    return data.results[0].locations
      .filter((location: any) => location.street && location.adminArea5)
      .map((location: any, index: number) => {
        // Formatear como Google Maps
        const parts = [];
        
        // Calle (ya incluye número si existe)
        if (location.street) {
          parts.push(location.street);
        }
        
        // Ciudad
        if (location.adminArea5) {
          parts.push(location.adminArea5);
        }
        
        // Estado
        if (location.adminArea3) {
          parts.push(location.adminArea3);
        }
        
        // Código postal
        if (location.postalCode) {
          parts.push(location.postalCode);
        }
        
        // País
        parts.push("Estados Unidos");
        
        const formattedAddress = parts.join(", ");
        
        return {
          display_name: formattedAddress,
          place_id: `mapquest_${index}`,
          lat: location.latLng.lat.toString(),
          lon: location.latLng.lng.toString(),
          type: "address",
          importance: 0.5,
          address: {
            house_number: location.street.match(/^\d+/) ? location.street.match(/^\d+/)[0] : undefined,
            road: location.street,
            city: location.adminArea5,
            state: location.adminArea3,
            postcode: location.postalCode,
            country: "Estados Unidos"
          }
        };
      })
      .slice(0, 5);
  }
}

// Instancia singleton para fácil uso
export const addressAutocompleteService = AddressAutocompleteService.getInstance();
