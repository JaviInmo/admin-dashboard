// src/components/Notes/Selects/GuardSelect.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { listGuards } from "@/lib/services/guard";
import type { Guard } from "@/components/Guards/types";

/**
 * Props:
 *  - value: guard seleccionado (controlado)
 *  - onChange: (guard|null) => void
 *  - placeholder: texto del input
 *  - preloadedGuards?: Guard[]  // cache opcional
 *  - id?: string
 *  - label?: string
 */
interface GuardSelectProps {
  value: Guard | null;
  onChange: (g: Guard | null) => void;
  placeholder?: string;
  preloadedGuards?: Guard[];
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
const guardLabel = (g?: Guard | null) => (g ? `${(g.firstName ?? "").trim()} ${(g.lastName ?? "").trim()}`.trim() || g.email || `#${g.id}` : "");

export default function GuardSelect({
  value,
  onChange,
  placeholder = "Buscar guard por nombre o email...",
  preloadedGuards = [],
  id,
  label,
  className,
}: GuardSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [guardQuery, setGuardQuery] = useState<string>("");
  const debouncedGuardQuery = useDebouncedValue(guardQuery, 300);

  const [allGuards, setAllGuards] = useState<Guard[]>(preloadedGuards ?? []);
  const [guardResults, setGuardResults] = useState<Guard[]>(preloadedGuards ?? []);
  const [guardsLoading, setGuardsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // sync preloadedGuards updates
  useEffect(() => {
    if (Array.isArray(preloadedGuards) && preloadedGuards.length > 0) {
      setAllGuards(preloadedGuards);
      setGuardResults(preloadedGuards);
    }
  }, [preloadedGuards]);

  // close dropdown on outside click / Escape
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

  // perform search (uses preloaded cache first, falls back to API)
  useEffect(() => {
    const q = (debouncedGuardQuery ?? "").trim().toLowerCase();
    if (q === "") {
      setGuardResults(allGuards);
      return;
    }

    const localResults = allGuards.filter((g) => {
      const fullName = `${g.firstName ?? ""} ${(g.lastName ?? "")}`.toLowerCase();
      const email = (g.email ?? "").toLowerCase();
      return fullName.includes(q) || email.includes(q) || String(g.id).includes(q);
    });

    // If cache is empty or local results are few, fetch from API
    if (allGuards.length === 0 || localResults.length < 3) {
      let mounted = true;
      setGuardsLoading(true);
      (async () => {
        try {
          const res = await listGuards(1, q, 10);
          if (!mounted) return;
          const apiItems = extractItems<Guard>(res);
          // merge local + api avoiding duplicates
          const localIds = new Set(localResults.map((x) => x.id));
          const combined = [...localResults, ...apiItems.filter((x) => !localIds.has(x.id))];
          setGuardResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          console.error("GuardSelect listGuards error:", err);
          setGuardResults(localResults);
        } finally {
          if (mounted) setGuardsLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    } else {
      setGuardResults(localResults);
    }
  }, [debouncedGuardQuery, allGuards]);

  // when value (selected guard) changes from parent, clear query
  useEffect(() => {
    if (value) {
      setGuardQuery("");
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
        value={value ? guardLabel(value) : guardQuery}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setGuardQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (guardResults.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar guard"
      />

      {value && (
        <button
          type="button"
          className="absolute right-2 top-2 text-xs text-muted-foreground"
          onClick={() => {
            onChange(null);
            setGuardQuery("");
            setGuardResults([]);
          }}
        >
          Clear
        </button>
      )}

      {dropdownOpen && (guardResults.length > 0 || guardsLoading) && (
        <div className="absolute z-50 mt-1 left-0 bg-white border rounded shadow max-h-36 overflow-auto w-full">
          {guardsLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
          {!guardsLoading && guardResults.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">No matches.</div>
          )}
          {!guardsLoading &&
            guardResults.map((g) => (
              <button
                key={g.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/10"
                onClick={() => {
                  onChange(g);
                  setGuardQuery("");
                  setDropdownOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <div className="text-sm truncate">{`${g.firstName ?? ""} ${g.lastName ?? ""}`}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{g.email}</div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
