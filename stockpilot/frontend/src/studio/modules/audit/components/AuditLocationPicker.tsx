import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
    RideBookingForm,
    type RideBookingSearchDetails,
    type RideBookingSuggestion,
} from "@/components/ui/ride-booking-form";
import type { AuditStore } from "../types";

interface AuditLocationPickerProps {
    locations: AuditStore[];
    onBack: () => void;
    onSelect: (location: AuditStore) => void;
}

type LocationMatchResult =
    | { kind: "empty" }
    | { kind: "none" }
    | { kind: "multiple"; matches: AuditStore[] }
    | { kind: "match"; location: AuditStore };

const HERO_IMAGE_SRC = "/images/studio/audit/location-picker-hero.webp";
const PICKUP_ICON_SRC = "/images/studio/audit/location-marker-3d.webp";

function normalizeSearchValue(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function buildLocationLabel(location: AuditStore) {
    return `${location.name}, ${location.city}`;
}

function buildSearchableLocation(location: AuditStore) {
    return normalizeSearchValue(`${location.name} ${location.code} ${location.city} ${location.country} ${location.type}`);
}

function resolveLocationMatch(locations: AuditStore[], pickup: string, dropoff: string): LocationMatchResult {
    const pickupTerm = normalizeSearchValue(pickup);
    const dropoffTerm = normalizeSearchValue(dropoff);

    if (!pickupTerm && !dropoffTerm) {
        return { kind: "empty" };
    }

    if (dropoffTerm) {
        const codeMatches = locations.filter((location) => normalizeSearchValue(location.code) === dropoffTerm);
        if (codeMatches.length === 1) {
            const [match] = codeMatches;
            if (!pickupTerm || buildSearchableLocation(match).includes(pickupTerm)) {
                return { kind: "match", location: match };
            }
        }
    }

    if (pickupTerm) {
        const exactNameMatches = locations.filter((location) => {
            const exactName = normalizeSearchValue(location.name);
            const exactComposite = normalizeSearchValue(buildLocationLabel(location));
            return exactName === pickupTerm || exactComposite === pickupTerm;
        });

        if (exactNameMatches.length === 1) {
            const [match] = exactNameMatches;
            if (!dropoffTerm || buildSearchableLocation(match).includes(dropoffTerm)) {
                return { kind: "match", location: match };
            }
        }
    }

    const searchTokens = [pickupTerm, dropoffTerm]
        .flatMap((term) => term.split(" "))
        .filter(Boolean);

    const partialMatches = locations.filter((location) => {
        const haystack = buildSearchableLocation(location);
        return searchTokens.every((token) => haystack.includes(token));
    });

    if (partialMatches.length === 1) {
        return { kind: "match", location: partialMatches[0] };
    }

    if (partialMatches.length === 0) {
        return { kind: "none" };
    }

    return {
        kind: "multiple",
        matches: partialMatches.slice(0, 3),
    };
}

export function AuditLocationPicker({ locations, onBack, onSelect }: AuditLocationPickerProps) {
    const initialLocation = locations[0] ?? null;
    const [feedback, setFeedback] = useState<string | null>(null);
    const [activeLocationLabel, setActiveLocationLabel] = useState<string>(initialLocation ? buildLocationLabel(initialLocation) : "Location");

    const storeSuggestions = useMemo<RideBookingSuggestion[]>(() => {
        return locations.map((location) => ({
            id: location.code,
            label: buildLocationLabel(location),
            value: buildLocationLabel(location),
        }));
    }, [locations]);

    const handleSearch = ({ pickup, dropoff }: RideBookingSearchDetails) => {
        const result = resolveLocationMatch(locations, pickup, dropoff);

        if (result.kind === "match") {
            setFeedback(null);
            setActiveLocationLabel(buildLocationLabel(result.location));
            onSelect(result.location);
            return;
        }

        if (result.kind === "empty") {
            setFeedback("Enter a store name, city, or location code to continue.");
            return;
        }

        if (result.kind === "none") {
            setFeedback("No store matched that search. Try a city name, the exact store name, or a code like LDN01.");
            return;
        }

        setFeedback(`Multiple stores matched. Narrow it down with the location code: ${result.matches.map((location) => location.code).join(", ")}.`);
    };

    return (
        <div className="h-full min-h-0 overflow-hidden">
            <RideBookingForm
                className="h-full"
                imageUrl={HERO_IMAGE_SRC}
                imageAlt="An audit specialist reviewing compliance paperwork in a busy office."
                city={activeLocationLabel}
                cityActionLabel="Change Location"
                title="Select the right location for this audit"
                pickupPlaceholder="Select store"
                pickupSuggestions={storeSuggestions}
                pickupIconSrc={PICKUP_ICON_SRC}
                pickupIconAlt="3D location marker"
                selectionGroupTitle="Notify Team"
                selectionOptions={[
                    "Sales",
                    "Visual Merchandising",
                    "Product Management",
                    "Operations",
                    "Finance",
                ]}
                showDropoffField={false}
                showScheduleFields={false}
                primaryActionLabel="Open checklist"
                helperText={feedback ? (
                    <div className={cn("rounded-[20px] border border-[#f0d3d5] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#8a3b43]") }>
                        <span className="font-semibold text-[#7a2029]">S+Audit:</span>{" "}
                        {feedback}
                    </div>
                ) : null}
                onSearch={handleSearch}
            />
        </div>
    );
}
