"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type OptionItem<T> = T;

type SelectSearchProps<T> = {
  value?: T | null;
  onChange: (value: T | null) => void;
  fetchOptions: (q: string) => Promise<T[]>;
  optionLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  getOptionKey?: (item: T) => string | number;
  minCharsToSearch?: number;
};

export function SelectSearch<T>({
  value,
  onChange,
  fetchOptions,
  optionLabel,
  placeholder,
  disabled = false,
  getOptionKey,
  minCharsToSearch = 1,
}: SelectSearchProps<T>) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const lastFetchRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // show selected label in input
  React.useEffect(() => {
    if (value) {
      setQuery(optionLabel(value));
    }
  }, [value, optionLabel]);

  // debounce search
  React.useEffect(() => {
    if (query.trim().length < minCharsToSearch) {
      setOptions([]);
      return;
    }
    const id = setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          const since = Date.now();
          lastFetchRef.current = since;
          const res = await fetchOptions(query.trim());
          // only apply if still latest
          if (!mountedRef.current) return;
          if (lastFetchRef.current === since) {
            setOptions(res);
            setHighlight(0);
            setOpen(true);
          }
        } catch (err) {
          console.error("SelectSearch fetch error", err);
        } finally {
          if (mountedRef.current) setLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(id);
  }, [query, fetchOptions, minCharsToSearch]);

  function handleSelect(item: T) {
    onChange(item);
    setOpen(false);
    // setQuery(optionLabel(item)); // should be already set via effect
    inputRef.current?.blur();
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setOptions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = options[highlight];
      if (sel) handleSelect(sel);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // if user types, we clear selected value so onChange will be fired only when selecting an option
            if (value) onChange(null);
          }}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm px-2 py-1 rounded hover:bg-muted/20"
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded border bg-white shadow-md max-h-64 overflow-auto">
          {loading ? (
            <div className="p-2 space-y-2">
              <Skeleton className="h-4 w-3/5 rounded" />
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ) : options.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No results</div>
          ) : (
            options.map((opt, idx) => {
              const key = getOptionKey ? getOptionKey(opt) : optionLabel(opt);
              const isHighlighted = idx === highlight;
              return (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-100 ${isHighlighted ? "bg-slate-100" : ""}`}
                >
                  {optionLabel(opt)}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
