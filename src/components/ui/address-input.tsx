import * as React from "react";
import { Input } from "@/components/ui/input";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import type { AddressSuggestion } from "@/lib/services/address-autocomplete";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  className?: string;
  label?: string;
  countryCode?: string;
}

export function AddressInput({
  value,
  onChange,
  placeholder = "Escribe una dirección...",
  name = "address",
  required = false,
  className = "",
  label,
  countryCode = "us"
}: AddressInputProps) {
  const {
    suggestions,
    isLoading,
    showSuggestions,
    searchAddresses,
    selectSuggestion,
    hideSuggestions,
    showSuggestionsIfAvailable
  } = useAddressAutocomplete(onChange, { countryCode });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchAddresses(newValue);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    selectSuggestion(suggestion);
  };

  const handleInputBlur = () => {
    // Delay para permitir clicks en sugerencias
    setTimeout(() => {
      hideSuggestions();
    }, 150);
  };

  const handleInputFocus = () => {
    showSuggestionsIfAvailable(value);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <Input
        name={name}
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Buscando direcciones...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id || index}
                className="px-4 py-3 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="font-medium text-gray-900 leading-tight">
                  {suggestion.display_name}
                </div>
                {(suggestion.address?.state || suggestion.address?.city) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {suggestion.address?.city && `${suggestion.address.city}, `}
                    {suggestion.address?.state || 'Estados Unidos'}
                    {suggestion.address?.postcode && ` ${suggestion.address.postcode}`}
                  </div>
                )}
              </div>
            ))
          ) : null}
        </div>
      )}
    </div>
  );
}
