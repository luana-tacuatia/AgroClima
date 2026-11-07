"use client";

import { MapPin } from "lucide-react";

import { GeolocationButton } from "@/components/location/geolocation-button";
import { LocationSearch } from "@/components/location/location-search";
import type { LocationResult } from "@/schemas/location";
import type { SelectedLocation } from "@/types/location";

interface SearchCardProps {
  title: string;
  subtitle: string;
  selected: SelectedLocation | null;
  isLoading: boolean;
  onSelect: (location: LocationResult | SelectedLocation) => void;
}

export function SearchCard({ title, subtitle, selected, isLoading, onSelect }: SearchCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{title}</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <LocationSearch onSelect={onSelect} />
        </div>
        <GeolocationButton onSelect={onSelect} disabled={isLoading} />
      </div>

      {selected && (
        <p className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {selected.name}
            {selected.state ? `, ${selected.state}` : ""}
          </span>
          <span className="shrink-0 font-normal text-emerald-700">
            ({selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)})
          </span>
        </p>
      )}
    </section>
  );
}
