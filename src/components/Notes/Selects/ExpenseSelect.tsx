// src/components/Notes/Selects/ExpenseSelect.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { listExpenses } from "@/lib/services/expenses";
import type { AppExpense } from "@/lib/services/expenses";

interface ExpenseSelectProps {
  value: AppExpense | null;
  onChange: (e: AppExpense | null) => void;
  placeholder?: string;
  preloadedExpenses?: AppExpense[];
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

const expenseLabel = (e?: AppExpense | null) => (e ? `${e.description ?? `#${e.id}`}` : "");

export default function ExpenseSelect({
  value,
  onChange,
  placeholder = "Buscar gastos...",
  preloadedExpenses = [],
  id,
  label,
  className,
}: ExpenseSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [all, setAll] = useState<AppExpense[]>(preloadedExpenses ?? []);
  const [results, setResults] = useState<AppExpense[]>(preloadedExpenses ?? []);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedExpenses) && preloadedExpenses.length > 0) {
      setAll(preloadedExpenses);
      setResults(preloadedExpenses);
    }
  }, [preloadedExpenses]);

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

    const local = all.filter((r) => ((r.description ?? "").toLowerCase().includes(q.toLowerCase()) || String(r.id).includes(q)));

    if (all.length === 0 || local.length < 3) {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          const res = await listExpenses(1, q, 10);
          if (!mounted) return;
          const items = extractItems<AppExpense>(res);
          const localIds = new Set(local.map((x) => x.id));
          const combined = [...local, ...items.filter((x) => !localIds.has(x.id))];
          setResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          console.error("ExpenseSelect listExpenses error:", err);
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
        value={value ? expenseLabel(value) : query}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar gasto"
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
                  <div className="text-sm truncate">{r.description ?? `#${r.id}`}</div>
                  <div className="text-xs text-muted-foreground">#{r.id}</div>
                </div>
                {r.amount && <div className="text-[11px] text-muted-foreground truncate">Amount: {r.amount}</div>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
