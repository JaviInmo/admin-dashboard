import * as React from "react";
import { addressAutocompleteService, type AddressSuggestion } from "@/lib/services/address-autocomplete";

interface UseAddressAutocompleteOptions {
  debounceMs?: number;
  minChars?: number;
  countryCode?: string;
}

interface UseAddressAutocompleteReturn {
  suggestions: AddressSuggestion[];
  isLoading: boolean;
  showSuggestions: boolean;
  searchAddresses: (query: string) => void;
  selectSuggestion: (suggestion: AddressSuggestion) => void;
  hideSuggestions: () => void;
  showSuggestionsIfAvailable: (query: string) => void;
}

export function useAddressAutocomplete(
  onAddressSelected: (address: string) => void,
  options: UseAddressAutocompleteOptions = {}
): UseAddressAutocompleteReturn {
  const {
    debounceMs = 300,
    minChars = 3,
    countryCode = 'us'
  } = options;

  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = React.useState<boolean>(false);

  // Función debounced para búsqueda
  const debouncedSearch = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return async (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (query.length < minChars) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
          }

          setIsLoading(true);
          try {
            const results = await addressAutocompleteService.searchAddresses(query, countryCode);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
          } catch (error) {
            console.error('Address search failed:', error);
            setSuggestions([]);
            setShowSuggestions(false);
          } finally {
            setIsLoading(false);
          }
        }, debounceMs);
      };
    }, [debounceMs, minChars, countryCode]),
    [debounceMs, minChars, countryCode]
  );

  const searchAddresses = React.useCallback((query: string) => {
    if (query.length >= minChars) {
      setShowSuggestions(true);
      debouncedSearch(query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [debouncedSearch, minChars]);

  const selectSuggestion = React.useCallback((suggestion: AddressSuggestion) => {
    onAddressSelected(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onAddressSelected]);

  const hideSuggestions = React.useCallback(() => {
    setShowSuggestions(false);
  }, []);

  const showSuggestionsIfAvailable = React.useCallback((query: string) => {
    if (suggestions.length > 0 && query.length >= minChars) {
      setShowSuggestions(true);
    }
  }, [suggestions.length, minChars]);

  return {
    suggestions,
    isLoading,
    showSuggestions,
    searchAddresses,
    selectSuggestion,
    hideSuggestions,
    showSuggestionsIfAvailable
  };
}
