// src/components/Notes/Selects/PropertySelect.tsx
"use client";

import  { useEffect, useRef, useState } from "react";
import { listProperties } from "@/lib/services/properties";
import type { AppProperty } from "@/lib/services/properties";

/**
 * Props:
 *  - value: selected property (AppProperty | null)
 *  - onChange: (prop|null) => void
 *  - placeholder?: string
 *  - preloadedProperties?: AppProperty[]
 *  - id?: string
 *  - label?: string
 *  - className?: string
 */
interface PropertySelectProps {
  value: AppProperty | null;
  onChange: (p: AppProperty | null) => void;
  placeholder?: string;
  preloadedProperties?: AppProperty[];
  id?: string;
  label?: string;
  className?: string;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function extractItems<T>(maybe: unknown): T[] {
  if (!maybe) return [];
  if (Array.isArray(maybe) && maybe.every((x) => typeof x === "object")) return maybe as unknown as T[];
  if (isObject(maybe)) {
    const obj = maybe as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results as unknown as T[];
    if (Array.isArray(obj.items)) return obj.items as unknown as T[];
    if (isObject(obj.data) && Array.isArray((obj.data as Record<string, unknown>).results)) {
      return (obj.data as Record<string, unknown>).results as unknown as T[];
    }
  }
  return [];
}
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
const propertyLabel = (p?: AppProperty | null) =>
  p ? `${p.alias ?? p.name ?? p.address ?? (typeof p === "object" && "id" in p ? `#${(p as AppProperty).id ?? "?"}` : "?")}` : "";

export default function PropertySelect({
  value,
  onChange,
  placeholder = "Buscar propiedades...",
  preloadedProperties = [],
  id,
  label,
  className,
}: PropertySelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [allProps, setAllProps] = useState<AppProperty[]>(preloadedProperties ?? []);
  const [results, setResults] = useState<AppProperty[]>(preloadedProperties ?? []);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedProperties) && preloadedProperties.length > 0) {
      setAllProps(preloadedProperties);
      setResults(preloadedProperties);
    }
  }, [preloadedProperties]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
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
      setResults(allProps);
      return;
    }

    const local = allProps.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const alias = (p.alias ?? "").toLowerCase();
      const addr = (p.address ?? "").toLowerCase();
      return name.includes(q) || alias.includes(q) || addr.includes(q) || String(p.id).includes(q);
    });

    if (allProps.length === 0 || local.length < 3) {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          const res = await listProperties(1, q, 10);
          if (!mounted) return;
          const apiItems = extractItems<AppProperty>(res);
          const localIds = new Set(local.map((x) => x.id));
          const combined = [...local, ...apiItems.filter((x) => !localIds.has(x.id))];
          setResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          console.error("PropertySelect listProperties error:", err);
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
  }, [debouncedQuery, allProps]);

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
        value={value ? propertyLabel(value) : query}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar propiedad"
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
        <div className="absolute z-50 mt-1 left-0   bg-white border rounded shadow max-h-36 overflow-auto w-full">
          {loading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
          {!loading && results.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/10"
                onClick={() => {
                  onChange(p);
                  setQuery("");
                  setDropdownOpen(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm truncate">{p.name ?? p.alias ?? p.address}</div>
                  <div className="text-xs text-muted-foreground">#{p.id}</div>
                </div>
                {p.address && <div className="text-[11px] text-muted-foreground truncate">{p.address}</div>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
