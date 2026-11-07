"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationResult } from "@/schemas/location";

interface LocationSearchProps {
  onSelect: (location: LocationResult) => void;
  initialValue?: string;
}

interface SearchState {
  status: "idle" | "loading" | "success" | "error";
  results: LocationResult[];
  query: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function LocationSearch({ onSelect, initialValue = "" }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<SearchState>({ status: "idle", results: [], query: "" });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Limpa o debounce ao desmontar.
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const performSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ status: "idle", results: [], query: "" });
      setIsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, status: "loading" }));
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/locations?query=${encodeURIComponent(trimmed)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { locations?: LocationResult[] };
      if (requestId !== requestIdRef.current) return;
      const results = data.locations ?? [];
      setState({ status: "success", results, query: trimmed });
      setActiveIndex(results.length > 0 ? 0 : -1);
      setIsOpen(true);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState({ status: "error", results: [], query: trimmed });
      setErrorMessage("Não foi possível buscar cidades. Tente novamente.");
      setIsOpen(true);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void performSearch(value);
    }, DEBOUNCE_MS);
  }

  function clearSearch() {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    setQuery("");
    setState({ status: "idle", results: [], query: "" });
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function selectResult(location: LocationResult) {
    setQuery(location.state ? `${location.name} - ${location.state}` : location.name);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    onSelect(location);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    const { results } = state;
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) selectResult(target);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="location-search-results"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `location-option-${activeIndex}` : undefined}
          placeholder="Busque uma cidade (ex.: Campinas)"
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-16 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {state.status === "loading" && (
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          )}
          {query.length > 0 && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={clearSearch}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <ul
          id="location-search-results"
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {state.status === "loading" && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando cidades…
            </li>
          )}
          {state.status === "error" && (
            <li role="alert" className="px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </li>
          )}
          {state.status === "success" && state.results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              Nenhuma cidade encontrada para “{state.query}”.
            </li>
          )}
          {state.status === "success" &&
            state.results.map((location, index) => (
              <li key={`${location.latitude.toFixed(5)}-${location.longitude.toFixed(5)}-${index}`}>
                <button
                  type="button"
                  id={`location-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => selectResult(location)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700",
                    index === activeIndex && "bg-sky-50 text-sky-800"
                  )}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">
                    <span className="font-medium">{location.name}</span>
                    {location.state ? (
                      <span className="text-slate-500"> · {location.state}</span>
                    ) : null}
                    <span className="text-slate-500"> · {location.country}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
