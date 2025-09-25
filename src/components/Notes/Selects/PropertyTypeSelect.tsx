// src/components/Notes/Selects/PropertyTypeSelect.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { listPropertyTypesOfService } from "@/lib/services/properties";
import type { AppPropertyType } from "@/lib/services/properties";

interface PropertyTypeSelectProps {
  value: AppPropertyType | null;
  onChange: (t: AppPropertyType | null) => void;
  placeholder?: string;
  preloadedTypes?: AppPropertyType[];
  id?: string;
  label?: string;
  className?: string;
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function PropertyTypeSelect({
  value,
  onChange,
  placeholder = "Buscar tipos de servicio...",
  preloadedTypes = [],
  id,
  label,
  className,
}: PropertyTypeSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [all, setAll] = useState<AppPropertyType[]>(preloadedTypes ?? []);
  const [results, setResults] = useState<AppPropertyType[]>(preloadedTypes ?? []);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedTypes) && preloadedTypes.length > 0) {
      setAll(preloadedTypes);
      setResults(preloadedTypes);
    }
  }, [preloadedTypes]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const q = (debouncedQuery ?? "").trim().toLowerCase();
    if (q === "") {
      setResults(all);
      return;
    }
    const local = all.filter((t) => (t.name ?? "").toLowerCase().includes(q));
    if (all.length === 0 || local.length < 3) {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          const res = await listPropertyTypesOfService(1, 20);
          if (!mounted) return;
          // res.items probablemente tenga {id, name}
          const items = (res.items ?? res) as AppPropertyType[];
          const localIds = new Set(local.map((x) => x.id));
          const combined = [...local, ...items.filter((x) => !localIds.has(x.id))];
          setResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          console.error("PropertyTypeSelect error:", err);
          setResults(local);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    } else {
      setResults(local);
    }
  }, [debouncedQuery, all]);

  useEffect(() => {
    if (value) {
      setQuery("");
      setDropdownOpen(false);
    }
  }, [value]);

  return (
    <div ref={containerRef} className={className ?? "relative"}>
      {label && <label className="text-sm text-muted-foreground block mb-1">{label}</label>}
      <input
        id={id}
        type="text"
        className="w-full rounded border px-3 py-1.5 text-sm"
        value={value ? value.name : query}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar tipo de servicio"
      />

      {value && (
        <button
          type="button"
          className="absolute right-2 top-2 text-xs text-muted-foreground"
          onClick={() => {
            onChange(null);
            setQuery("");
            setResults([]);
          }}
        >
          Clear
        </button>
      )}

      {dropdownOpen && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded shadow max-h-36 overflow-auto w-full">
          {loading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
          {!loading && results.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
          {!loading &&
            results.map((t) => (
              <button
                key={t.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/10"
                onClick={() => {
                  onChange(t);
                  setQuery("");
                  setDropdownOpen(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">#{t.id}</div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
