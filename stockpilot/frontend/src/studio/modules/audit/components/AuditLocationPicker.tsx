import { ArrowLeft, Search, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AuditStore } from "../types";
import { formatOpeningDate } from "../utils";

interface AuditLocationPickerProps {
    locations: AuditStore[];
    onBack: () => void;
    onSelect: (location: AuditStore) => void;
}

type LocationFilter = "all" | AuditStore["type"];

const FILTERS: Array<{ id: LocationFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "Street", label: "Street" },
    { id: "Mall", label: "Mall" },
];

export function AuditLocationPicker({ locations, onBack, onSelect }: AuditLocationPickerProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<LocationFilter>("all");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 180);
        return () => window.clearTimeout(timer);
    }, [query]);

    const filteredLocations = useMemo(() => {
        return locations.filter((location) => {
            const matchesFilter = activeFilter === "all" || location.type === activeFilter;
            const matchesQuery = debouncedQuery.length === 0
                || [location.name, location.city, location.code].some((value) => value.toLowerCase().includes(debouncedQuery));
            return matchesFilter && matchesQuery;
        });
    }, [activeFilter, debouncedQuery, locations]);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto px-1 pb-6">
            <div className="rounded-[24px] border border-line bg-white px-6 py-6 shadow-soft sm:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-500"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Audit setup
                        </p>
                        <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">
                            Select location
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                            Search by store name, city, or location code. Use the filter to narrow down Street or Mall locations.
                        </p>
                    </div>

                    <div className="grid gap-3 md:w-[420px]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search location, city, or code"
                                className="w-full rounded-full border border-line bg-white px-11 py-3 text-sm text-ink outline-none"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((filter) => (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${activeFilter === filter.id ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-500"}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {filteredLocations.length > 0 ? filteredLocations.map((location) => (
                    <article key={location.code} className="rounded-[20px] border border-line bg-white px-6 py-6 shadow-soft">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-mist text-brand">
                                    <Store className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate font-display text-[1.15rem] font-semibold tracking-tight text-ink">
                                        {location.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {location.city} • {location.type} • {location.size_m2} m²
                                    </p>
                                    <p className="mt-3 text-sm text-slate-500">
                                        {location.staff_count} staff • Opened {formatOpeningDate(location.opening_date)}
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-full border border-line bg-mist px-3 py-1 text-xs font-semibold text-slate-500">
                                {location.code}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onSelect(location)}
                            className="mt-6 inline-flex items-center justify-center rounded-full border border-ink bg-ink px-5 py-3 text-sm font-semibold text-white"
                        >
                            Select
                        </button>
                    </article>
                )) : (
                    <div className="col-span-full rounded-[20px] border border-line bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-soft">
                        No locations match the current search.
                    </div>
                )}
            </div>
        </div>
    );
}
