// src/components/Notes/Selects/UserSelect.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { listUsers } from "@/lib/services/users";
import type { AppUser } from "@/lib/services/users";

/**
 * Props:
 *  - value: selected user (AppUser | null)
 *  - onChange: (user|null) => void
 *  - placeholder?: string
 *  - preloadedUsers?: AppUser[]
 *  - id?: string
 *  - label?: string
 *  - className?: string
 */
interface UserSelectProps {
  value: AppUser | null;
  onChange: (u: AppUser | null) => void;
  placeholder?: string;
  preloadedUsers?: AppUser[];
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

const userLabel = (u?: AppUser | null) => (u ? `${u.name ?? u.username ?? `#${u.id}`}` : "");

export default function UserSelect({
  value,
  onChange,
  placeholder = "Buscar usuario...",
  preloadedUsers = [],
  id,
  label,
  className,
}: UserSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [all, setAll] = useState<AppUser[]>(preloadedUsers ?? []);
  const [results, setResults] = useState<AppUser[]>(preloadedUsers ?? []);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedUsers) && preloadedUsers.length > 0) {
      setAll(preloadedUsers);
      setResults(preloadedUsers);
    }
  }, [preloadedUsers]);

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

    const local = all.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const username = (u.username ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || username.includes(q) || String(u.id).includes(q);
    });

    if (all.length === 0 || local.length < 3) {
      let mounted = true;
      setLoading(true);
      (async () => {
        try {
          const res = await listUsers(1, q, 10);
          if (!mounted) return;
          const items = extractItems<AppUser>(res);
          const localIds = new Set(local.map((x) => x.id));
          const combined = [...local, ...items.filter((x) => !localIds.has(x.id))];
          setResults(combined);
          setDropdownOpen(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("UserSelect listUsers error:", err);
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
        value={value ? userLabel(value) : query}
        placeholder={placeholder}
        onChange={(e) => {
          if (value) onChange(null);
          setQuery(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setDropdownOpen(true);
        }}
        aria-label="Buscar usuario"
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
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/10"
                onClick={() => {
                  onChange(u);
                  setQuery("");
                  setDropdownOpen(false);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm truncate">{u.name ?? u.username ?? `#${u.id}`}</div>
                  <div className="text-xs text-muted-foreground">#{u.id}</div>
                </div>
                {u.email && <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
