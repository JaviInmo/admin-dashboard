// src/components/Notes/Selects/ShiftSelect.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { listShifts } from "@/lib/services/shifts";
import type { Shift } from "@/components/Shifts/types";

interface ShiftSelectProps {
  value: Shift | null;
  onChange: (s: Shift | null) => void;
  placeholder?: string;
  preloadedShifts?: Shift[];
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

const shiftLabel = (s?: Shift | null) => (s ? `#${s.id}${s.startTime ? ` — ${s.startTime}` : ""}` : "");

export default function ShiftSelect({
  value,
  onChange,
  placeholder = "Buscar shifts...",
  preloadedShifts = [],
  id,
  label,
  className,
}: ShiftSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [all, setAll] = useState<Shift[]>(preloadedShifts ?? []);
  const [results, setResults] = useState<Shift[]>(preloadedShifts ?? []);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedShifts) && preloadedShifts.length > 0) {
      setAll(preloadedShifts);
      setResults(preloadedShifts);
    }
  }, [preloadedShifts]);

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
    const q = (debouncedQuery ?? "").trim();
    if (q === "") {
      setResults(all);
      return;
    }

    const local = all.filter((r) =>
      (`#${r.id}`.includes(q) ||
        String(r.guard).includes(q) ||
        String(r.property).includes(q) ||
        (r.guardName ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (r.propertyName ?? "").toLowerCase().includes(q.toLowerCase()))
    );

    if (all.length === 0 || local.length < 3) {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          const res = await listShifts(1, q, 10);
          if (!mounted) return;
          const items = extractItems<Shift>(res);
          const localIds = new Set(local.map((x) => x.id));
          const combined = [...local, ...items.filter((x) => !localIds.has(x.id))];
          setResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          console.error("ShiftSelect listShifts error:", err);
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
        value={value ? shiftLabel(value) : query}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar shift"
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
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/10"
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setDropdownOpen(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm truncate">#{r.id} {r.startTime ? `— ${r.startTime}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{r.status ?? ""}</div>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {r.guardName ? `Guard: ${r.guardName}` : `Guard: #${r.guard}`} • {r.propertyName ?? `Property: #${r.property}`}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
