"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Check, ChevronDown, Clock, MapPin, Plus, Send, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RideBookingSearchDetails {
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
}

export interface RideBookingSuggestion {
    id: string;
    label: string;
    value?: string;
}

interface RideBookingFormProps extends React.HTMLAttributes<HTMLDivElement> {
    imageUrl: string;
    city?: string;
    cityActionLabel?: string;
    onCityAction?: () => void;
    title?: string;
    pickupPlaceholder?: string;
    dropoffPlaceholder?: string;
    pickupSuggestions?: RideBookingSuggestion[];
    pickupIconSrc?: string;
    pickupIconAlt?: string;
    selectionGroupTitle?: string;
    selectionOptions?: string[];
    showDropoffField?: boolean;
    dateLabel?: string;
    timeLabel?: string;
    showScheduleFields?: boolean;
    primaryActionLabel?: string;
    secondaryActionLabel?: string;
    secondaryActionHref?: string;
    onSecondaryAction?: () => void;
    helperText?: React.ReactNode;
    imageAlt?: string;
    onSearch: (details: RideBookingSearchDetails) => void;
}

export const RideBookingForm = React.forwardRef<HTMLDivElement, RideBookingFormProps>(
    (
        {
            className,
            imageUrl,
            city = "Chandigarh, IN",
            cityActionLabel = "Change city",
            onCityAction,
            title = "Go anywhere with Uber",
            pickupPlaceholder = "Pickup location",
            dropoffPlaceholder = "Dropoff location",
            pickupSuggestions = [],
            pickupIconSrc,
            pickupIconAlt = "Location marker",
            selectionGroupTitle,
            selectionOptions = [],
            showDropoffField = true,
            dateLabel = "Today",
            timeLabel = "Now",
            showScheduleFields = true,
            primaryActionLabel = "See prices",
            secondaryActionLabel = "Log in to see your recent activity",
            secondaryActionHref,
            onSecondaryAction,
            helperText,
            imageAlt = "Illustration of a person getting into a car in a city",
            onSearch,
            ...props
        },
        ref
    ) => {
        const [pickup, setPickup] = React.useState("");
        const [dropoff, setDropoff] = React.useState("");
        const [isPickupMenuOpen, setIsPickupMenuOpen] = React.useState(false);
        const [selectedSelectionOption, setSelectedSelectionOption] = React.useState<string | null>(selectionOptions[0] ?? null);
        const [isSelectionInputOpen, setIsSelectionInputOpen] = React.useState(false);
        const [selectionInputValue, setSelectionInputValue] = React.useState("");
        const pickupFieldRef = React.useRef<HTMLDivElement | null>(null);
        const pickupInputRef = React.useRef<HTMLInputElement | null>(null);

        React.useEffect(() => {
            if (!isPickupMenuOpen) {
                return undefined;
            }

            const handlePointerDown = (event: MouseEvent) => {
                if (pickupFieldRef.current && !pickupFieldRef.current.contains(event.target as Node)) {
                    setIsPickupMenuOpen(false);
                }
            };

            document.addEventListener("mousedown", handlePointerDown);
            return () => document.removeEventListener("mousedown", handlePointerDown);
        }, [isPickupMenuOpen]);

        const filteredPickupSuggestions = React.useMemo(() => {
            const normalizedPickup = pickup.trim().toLowerCase();
            return normalizedPickup.length === 0
                ? pickupSuggestions
                : pickupSuggestions.filter((suggestion) => suggestion.label.toLowerCase().includes(normalizedPickup));
        }, [pickup, pickupSuggestions]);

        const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setIsPickupMenuOpen(false);
            onSearch({
                pickup,
                dropoff,
                date: dateLabel,
                time: timeLabel,
            });
        };

        const handlePickupSuggestionSelect = (suggestion: RideBookingSuggestion) => {
            setPickup(suggestion.value ?? suggestion.label);
            setIsPickupMenuOpen(false);
            pickupInputRef.current?.focus();
        };

        const containerVariants = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.15 },
            },
        };

        const itemVariants = {
            hidden: { y: 18, opacity: 0 },
            visible: {
                y: 0,
                opacity: 1,
                transition: { type: "spring" as const, stiffness: 110, damping: 18 },
            },
        };

        return (
            <div
                className={cn("mx-auto flex h-full w-full max-w-[1500px] p-2 lg:p-4", className)}
                ref={ref}
                {...props}
            >
                <div className="h-full w-full overflow-hidden rounded-[12px] bg-[#fcfdfe]">
                    <div className="grid h-full w-full grid-cols-1 items-center gap-6 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:gap-8 lg:p-6">
                        <motion.div
                            className="flex min-h-0 flex-col justify-center px-3 py-2 sm:px-5 sm:py-4 lg:px-6"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                        <motion.div variants={itemVariants} className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="h-5 w-5 text-slate-400" strokeWidth={1.6} />
                            <span className="font-light text-slate-500">{city}</span>
                            {cityActionLabel ? (
                                onCityAction ? (
                                    <button
                                        type="button"
                                        onClick={onCityAction}
                                        className="font-medium text-[#101716] transition hover:text-[#3f8f79]"
                                    >
                                        {cityActionLabel}
                                    </button>
                                ) : (
                                    <span className="font-medium text-[#101716]">{cityActionLabel}</span>
                                )
                            ) : null}
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="max-w-[10ch] text-[clamp(2.7rem,5vw,4.7rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-[#09090b]"
                        >
                            {title}
                        </motion.h1>

                        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                            <motion.div variants={itemVariants} className="relative rounded-[12px] bg-slate-100 p-4">
                                <div className="absolute left-9 top-[3.35rem] bottom-[3.25rem] w-px border-l border-dashed border-[#d6d9d3]" />

                                <div ref={pickupFieldRef} className="relative">
                                    <div
                                        className="relative flex cursor-text items-center"
                                        onClick={() => {
                                            setIsPickupMenuOpen(true);
                                            pickupInputRef.current?.focus();
                                        }}
                                    >
                                        <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center text-[#101716]">
                                            {pickupIconSrc ? (
                                                <img
                                                    src={pickupIconSrc}
                                                    alt={pickupIconAlt}
                                                    className="h-11 w-11 object-contain"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d7dbd4] bg-white">
                                                    <MapPin className="h-5 w-5" strokeWidth={1.6} />
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={pickupInputRef}
                                            type="text"
                                            placeholder={pickupPlaceholder}
                                            value={pickup}
                                            onFocus={() => setIsPickupMenuOpen(true)}
                                            onChange={(event) => {
                                                setPickup(event.target.value);
                                                setIsPickupMenuOpen(true);
                                            }}
                                            className="w-full bg-transparent px-4 py-3 text-[15px] text-[#101716] outline-none placeholder:text-sm placeholder:font-light placeholder:text-slate-500"
                                            aria-label={pickupPlaceholder}
                                            aria-expanded={isPickupMenuOpen}
                                            aria-haspopup="listbox"
                                        />
                                        {pickupSuggestions.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setIsPickupMenuOpen((current) => !current);
                                                    pickupInputRef.current?.focus();
                                                }}
                                                className="absolute right-1 inline-flex items-center gap-1 rounded-full px-3 py-2 text-slate-400 transition hover:text-[#101716]"
                                                aria-label="Open store list"
                                            >
                                                <ChevronDown className={cn("h-4 w-4 transition", isPickupMenuOpen ? "rotate-180" : "rotate-0")} />
                                            </button>
                                        ) : (
                                            <button type="button" className="absolute right-2 rounded-full p-2 text-slate-400 transition hover:text-[#101716]">
                                                <Send className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {pickupSuggestions.length > 0 && isPickupMenuOpen ? (
                                        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[12px] border border-[#e1e5de] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                                            <div
                                                className="max-h-[225px] overflow-y-auto py-2"
                                                role="listbox"
                                                aria-label="Store suggestions"
                                            >
                                                {filteredPickupSuggestions.length > 0 ? filteredPickupSuggestions.map((suggestion) => {
                                                    const isSelected = pickup === (suggestion.value ?? suggestion.label);
                                                    return (
                                                        <button
                                                            key={suggestion.id}
                                                            type="button"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => handlePickupSuggestionSelect(suggestion)}
                                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-[#101716] transition hover:bg-[#f5f7f4]"
                                                        >
                                                            <span className="truncate">{suggestion.label}</span>
                                                            {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#3f8f79]" /> : null}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="px-4 py-4 text-sm text-slate-500">
                                                        No stores match that search.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {showDropoffField ? (
                                    <>
                                        <hr className="mx-12 border-[#dde1da]" />

                                        <div className="relative mt-2 flex items-center">
                                            <div className="z-10 rounded-full border border-[#d7dbd4] bg-white p-1.5 text-[#101716]">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={dropoffPlaceholder}
                                                value={dropoff}
                                                onChange={(event) => setDropoff(event.target.value)}
                                                className="w-full bg-transparent px-4 py-3 text-[15px] text-[#101716] outline-none placeholder:text-slate-400"
                                                aria-label={dropoffPlaceholder}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </motion.div>

                            {selectionGroupTitle && selectionOptions.length > 0 ? (
                                <motion.div variants={itemVariants} className="space-y-3 pt-1">
                                    <p className="text-sm font-medium text-[#101716]">
                                        {selectionGroupTitle}
                                    </p>
                                    <div className="flex flex-wrap gap-2.5">
                                        {selectionOptions.map((option) => {
                                            const isSelected = selectedSelectionOption === option;
                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => setSelectedSelectionOption(option)}
                                                    className={cn(
                                                        "inline-flex items-center justify-center rounded-[12px] border px-4 py-2.5 text-sm font-medium transition",
                                                        isSelected
                                                            ? "border-[#111827] bg-[#111827] text-white"
                                                            : "border-[#d7dbd4] bg-white text-slate-500 hover:border-slate-300 hover:text-[#101716]"
                                                    )}
                                                >
                                                    {option}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => setIsSelectionInputOpen((current) => !current)}
                                            className={cn(
                                                "inline-flex items-center justify-center gap-2 rounded-[12px] border px-4 py-2.5 text-sm font-medium transition",
                                                isSelectionInputOpen
                                                    ? "border-[#111827] bg-[#111827] text-white"
                                                    : "border-[#d7dbd4] bg-white text-slate-500 hover:border-slate-300 hover:text-[#101716]"
                                            )}
                                        >
                                            <UserPlus className="h-4 w-4" strokeWidth={1.8} />
                                            Add Recipient
                                        </button>
                                    </div>
                                    {isSelectionInputOpen ? (
                                        <div className="pt-1">
                                            <input
                                                type="text"
                                                value={selectionInputValue}
                                                onChange={(event) => setSelectionInputValue(event.target.value)}
                                                placeholder="Type name or email"
                                                className="w-full rounded-[12px] border border-[#d7dbd4] bg-white px-4 py-3 text-sm text-[#101716] outline-none placeholder:text-slate-400"
                                                aria-label="Add recipient"
                                            />
                                        </div>
                                    ) : null}
                                </motion.div>
                            ) : null}

                            {showScheduleFields ? (
                                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center rounded-[22px] bg-[#f6f7f4] px-4 py-4 text-[#101716]">
                                        <Calendar className="h-5 w-5 text-slate-400" />
                                        <span className="ml-3 text-sm font-medium">{dateLabel}</span>
                                    </div>
                                    <div className="flex items-center rounded-[22px] bg-[#f6f7f4] px-4 py-4 text-[#101716]">
                                        <Clock className="h-5 w-5 text-slate-400" />
                                        <span className="ml-3 text-sm font-medium">{timeLabel}</span>
                                    </div>
                                </motion.div>
                            ) : null}

                            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="inline-flex h-12 items-center justify-center rounded-[12px] bg-[#111827] px-8 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                                >
                                    {primaryActionLabel}
                                </button>

                                {secondaryActionLabel ? (
                                    onSecondaryAction ? (
                                        <button
                                            type="button"
                                            onClick={onSecondaryAction}
                                            className="group inline-flex items-center text-sm text-slate-500 transition hover:text-[#101716]"
                                        >
                                            {secondaryActionLabel}
                                            <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                                        </button>
                                    ) : secondaryActionHref ? (
                                        <a
                                            href={secondaryActionHref}
                                            className="group inline-flex items-center text-sm text-slate-500 transition hover:text-[#101716]"
                                        >
                                            {secondaryActionLabel}
                                            <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center text-sm text-slate-500">
                                            {secondaryActionLabel}
                                        </span>
                                    )
                                ) : null}
                            </motion.div>

                            {helperText ? (
                                <motion.div variants={itemVariants} className="pt-2">
                                    {helperText}
                                </motion.div>
                            ) : null}
                        </form>
                    </motion.div>

                        <motion.div
                            className="hidden h-full min-h-[480px] w-full p-3 lg:block"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                        >
                            <img
                                src={imageUrl}
                                alt={imageAlt}
                                className="h-full w-full rounded-[12px] object-cover shadow-[0_28px_80px_rgba(15,23,42,0.16)]"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }
);

RideBookingForm.displayName = "RideBookingForm";
