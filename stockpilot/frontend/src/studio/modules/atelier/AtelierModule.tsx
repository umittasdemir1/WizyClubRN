import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Upload, X } from "lucide-react";
import { usePivotStudio } from "../../../components/canvas/PivotStudioContext";
import {
    buildAtelierPlanSnapshot,
    type AtelierAction,
    type AtelierPlannerRules,
    type AtelierScopeMode,
    type AtelierViewMode
} from "./atelierPlanning";

interface AtelierModuleProps {
    onOpenLabs: () => void;
}

const VIEW_TABS: { id: AtelierViewMode; label: string }[] = [
    { id: "all", label: "All" },
    { id: "rebalance", label: "Rebalance" },
    { id: "replenish", label: "Replenish" },
    { id: "liquidate", label: "Liquidate" },
    { id: "review", label: "Review" },
];

function formatInteger(value: number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function toNullableNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function actionToneClass(action: AtelierAction) {
    switch (action) {
        case "rebalance":
            return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
        case "replenish":
            return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
        case "liquidate":
            return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
        case "review":
            return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
        default:
            return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    }
}

function EmptyAtelierState({
    onOpenLabs,
    onUploadClick,
}: Pick<AtelierModuleProps, "onOpenLabs"> & { onUploadClick: () => void }) {
    return (
        <div className="rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_-44px_rgba(15,23,42,0.28)]">
            <div className="flex flex-col gap-6 px-8 py-10 sm:px-10">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        S+Atelier
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                        Rule-driven product planning
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-500">
                        Upload a dataset first. Then you can define store scope, lock specific stores out of
                        transfer, and control minimum or maximum thresholds directly from this screen.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={onUploadClick}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#246BFD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f5fe0]"
                    >
                        <Upload className="h-4 w-4" />
                        Upload dataset
                    </button>
                    <button
                        type="button"
                        onClick={onOpenLabs}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Open S+Labs
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AtelierModule({ onOpenLabs }: AtelierModuleProps) {
    const {
        files,
        activeFileIdx,
        onSelectFile,
        onRemoveFile,
        onUploadClick,
    } = usePivotStudio();

    const activeResult = files[activeFileIdx] ?? null;

    const [scopeMode, setScopeMode] = useState<AtelierScopeMode>("general");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [viewMode, setViewMode] = useState<AtelierViewMode>("all");
    const [excludedWarehouses, setExcludedWarehouses] = useState<string[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [minSalesInput, setMinSalesInput] = useState("");
    const [minInventoryInput, setMinInventoryInput] = useState("");
    const [maxInventoryInput, setMaxInventoryInput] = useState("");

    const deferredSearch = useDeferredValue(searchInput);

    const rules = useMemo<AtelierPlannerRules>(() => ({
        scopeMode,
        selectedWarehouse: scopeMode === "specific" ? selectedWarehouse || null : null,
        excludedWarehouses,
        minSalesQty: toNullableNumber(minSalesInput),
        minInventory: toNullableNumber(minInventoryInput),
        maxInventory: toNullableNumber(maxInventoryInput),
        searchTerm: deferredSearch,
        viewMode,
    }), [
        deferredSearch,
        excludedWarehouses,
        maxInventoryInput,
        minInventoryInput,
        minSalesInput,
        scopeMode,
        selectedWarehouse,
        viewMode,
    ]);

    const snapshot = useMemo(
        () => buildAtelierPlanSnapshot(activeResult?.analysis ?? null, rules),
        [activeResult, rules]
    );

    useEffect(() => {
        if (!snapshot) return;
        if (scopeMode === "specific" && (!selectedWarehouse || !snapshot.warehouses.includes(selectedWarehouse))) {
            setSelectedWarehouse(snapshot.warehouses[0] ?? "");
        }
    }, [scopeMode, selectedWarehouse, snapshot]);

    function toggleExcludedWarehouse(warehouseName: string) {
        if (scopeMode === "specific" && selectedWarehouse === warehouseName) {
            return;
        }

        setExcludedWarehouses((current) =>
            current.includes(warehouseName)
                ? current.filter((item) => item !== warehouseName)
                : [...current, warehouseName]
        );
    }

    if (!activeResult || !snapshot) {
        return (
            <div className="px-[10px] pb-[10px] pt-4">
                <EmptyAtelierState onOpenLabs={onOpenLabs} onUploadClick={onUploadClick} />
            </div>
        );
    }

    return (
        <div className="px-[10px] pb-[10px] pt-4">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_60px_-48px_rgba(15,23,42,0.3)]">
                <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            S+Atelier
                        </p>
                        <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-900">
                            Product planning
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                            Store scope, protected stores, and inventory thresholds are controlled here.
                            The table below recalculates directly from the active dataset.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                {activeResult.parsed.fileName}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                {formatInteger(activeResult.analysis.rowCount)} rows
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                {activeResult.source === "api" ? "API pipeline" : "Local engine"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        {files.length > 1 && (
                            <select
                                value={String(activeFileIdx)}
                                onChange={(event) => onSelectFile(Number(event.target.value))}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#246BFD]"
                            >
                                {files.map((file, index) => (
                                    <option key={`${file.parsed.fileName}:${index}`} value={index}>
                                        {file.parsed.fileName}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            type="button"
                            onClick={onOpenLabs}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Open S+Labs
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onUploadClick}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#246BFD] px-4 text-sm font-semibold text-white transition hover:bg-[#1f5fe0]"
                        >
                            <Upload className="h-4 w-4" />
                            Upload dataset
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-6 py-3">
                    {VIEW_TABS.map((tab) => {
                        const active = tab.id === viewMode;
                        const count = snapshot.counts[tab.id];
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setViewMode(tab.id)}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    active
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="xl:col-span-2">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Store Scope
                        </p>
                        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setScopeMode("general")}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${scopeMode === "general" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                                General
                            </button>
                            <button
                                type="button"
                                onClick={() => setScopeMode("specific")}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${scopeMode === "specific" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                                Specific Store
                            </button>
                        </div>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Selected Store
                        </span>
                        <select
                            value={selectedWarehouse}
                            onChange={(event) => setSelectedWarehouse(event.target.value)}
                            disabled={scopeMode !== "specific"}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-[#246BFD]"
                        >
                            {snapshot.warehouses.map((warehouse) => (
                                <option key={warehouse} value={warehouse}>
                                    {warehouse}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Min Sales
                        </span>
                        <input
                            value={minSalesInput}
                            onChange={(event) => setMinSalesInput(event.target.value)}
                            inputMode="numeric"
                            placeholder="0"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#246BFD]"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Min Inventory
                        </span>
                        <input
                            value={minInventoryInput}
                            onChange={(event) => setMinInventoryInput(event.target.value)}
                            inputMode="numeric"
                            placeholder="0"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#246BFD]"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Max Inventory
                        </span>
                        <input
                            value={maxInventoryInput}
                            onChange={(event) => setMaxInventoryInput(event.target.value)}
                            inputMode="numeric"
                            placeholder="No limit"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#246BFD]"
                        />
                    </label>
                </div>

                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Protected Stores
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Stores selected here are excluded from transfer and allocation moves.
                            </p>
                        </div>
                        <div className="relative w-full max-w-[280px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchInput}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    startTransition(() => setSearchInput(nextValue));
                                }}
                                placeholder="Search product or store"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#246BFD]"
                            />
                        </div>
                    </div>
                    <div className="mt-4 max-h-[96px] overflow-y-auto pr-1">
                        <div className="flex flex-wrap gap-2">
                            {snapshot.warehouses.map((warehouse) => {
                                const locked = excludedWarehouses.includes(warehouse);
                                const disabled = scopeMode === "specific" && selectedWarehouse === warehouse;
                                return (
                                    <button
                                        key={warehouse}
                                        type="button"
                                        onClick={() => toggleExcludedWarehouse(warehouse)}
                                        disabled={disabled}
                                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                            locked
                                                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                                    >
                                        {warehouse}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1.5">
                            Usable rows {formatInteger(snapshot.dataset.usableRows)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5">
                            Visible rows {formatInteger(snapshot.rows.length)}
                        </span>
                        {snapshot.dataset.discardedRows > 0 && (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                                Discarded {formatInteger(snapshot.dataset.discardedRows)}
                            </span>
                        )}
                        {snapshot.dataQuality.missingCoreFields.length > 0 && (
                            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                                Missing {snapshot.dataQuality.missingCoreFields.join(", ")}
                            </span>
                        )}
                    </div>
                    {files.length > 1 && (
                        <button
                            type="button"
                            onClick={() => onRemoveFile(activeFileIdx)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:bg-slate-50"
                        >
                            <X className="h-3.5 w-3.5" />
                            Remove current dataset
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            <tr>
                                <th className="border-b border-slate-200 px-6 py-4">Product</th>
                                <th className="border-b border-slate-200 px-4 py-4">Scope</th>
                                <th className="border-b border-slate-200 px-4 py-4">Status</th>
                                <th className="border-b border-slate-200 px-4 py-4">Inventory</th>
                                <th className="border-b border-slate-200 px-4 py-4">Net Sales</th>
                                <th className="border-b border-slate-200 px-4 py-4">Transfer</th>
                                <th className="border-b border-slate-200 px-4 py-4">Demand Gap</th>
                                <th className="border-b border-slate-200 px-6 py-4">Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot.rows.map((row) => (
                                <tr key={row.id} className="text-slate-700 transition hover:bg-slate-50/80">
                                    <td className="border-b border-slate-100 px-6 py-4 align-top">
                                        <p className="font-semibold text-slate-900">{row.productName}</p>
                                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                            {row.productCode}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">{row.variantLabel}</p>
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top">
                                        <p className="font-medium text-slate-800">{row.scopeLabel}</p>
                                        <p className="mt-1 text-sm text-slate-500">{row.routeLabel}</p>
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${actionToneClass(row.action)}`}>
                                            {row.actionLabel}
                                        </span>
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top font-medium text-slate-900">
                                        {formatInteger(row.inventory)}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top font-medium text-slate-900">
                                        {formatInteger(row.netSalesQty)}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top">
                                        {formatInteger(row.transferUnits)}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-4 align-top">
                                        {formatInteger(row.demandGapUnits)}
                                    </td>
                                    <td className="border-b border-slate-100 px-6 py-4 align-top">
                                        <p className="text-sm leading-6 text-slate-600">{row.actionReason}</p>
                                    </td>
                                </tr>
                            ))}
                            {snapshot.rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500">
                                        No rows match the current scope and threshold rules.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
