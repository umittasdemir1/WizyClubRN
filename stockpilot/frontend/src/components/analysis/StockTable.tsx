import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import type { AnalyzedInventoryRecord } from "../../types/stock";
import { formatCurrency } from "../../utils/formatting";
import { Card } from "../shared/Card";

type SortKey = keyof Pick<
    AnalyzedInventoryRecord,
    "sku" | "productName" | "store" | "category" | "onHand" | "stockValue" | "abcClass" | "stockStatus"
>;

interface StockTableProps {
    records: AnalyzedInventoryRecord[];
}

function sortRecords(records: AnalyzedInventoryRecord[], sortKey: SortKey, direction: "asc" | "desc") {
    return [...records].sort((left, right) => {
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];

        if (typeof leftValue === "number" && typeof rightValue === "number") {
            return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
        }

        const leftText = String(leftValue);
        const rightText = String(rightValue);
        return direction === "asc"
            ? leftText.localeCompare(rightText)
            : rightText.localeCompare(leftText);
    });
}

export function StockTable({ records }: StockTableProps) {
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("stockValue");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());

    const filtered = records.filter((record) => {
        if (!deferredQuery) {
            return true;
        }

        return [
            record.sku,
            record.productName,
            record.store,
            record.category,
            record.abcClass,
            record.stockStatus
        ]
            .join(" ")
            .toLowerCase()
            .includes(deferredQuery);
    });

    const sorted = sortRecords(filtered, sortKey, sortDirection);

    function handleSort(nextKey: SortKey) {
        if (nextKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            return;
        }

        setSortKey(nextKey);
        setSortDirection(nextKey === "sku" ? "asc" : "desc");
    }

    return (
        <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Stock Analysis
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Searchable and sortable inventory grid
                    </h3>
                </div>
                <label className="flex items-center gap-2 rounded-pill border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <Search className="h-4 w-4" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="w-full bg-transparent outline-none lg:w-72"
                        placeholder="Search by SKU, product, store..."
                    />
                </label>
            </div>

            <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-100">
                <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
                            <tr className="text-slate-500">
                                {[
                                    ["sku", "SKU"],
                                    ["productName", "Product"],
                                    ["store", "Store"],
                                    ["category", "Category"],
                                    ["onHand", "On Hand"],
                                    ["stockValue", "Value"],
                                    ["abcClass", "ABC"],
                                    ["stockStatus", "Status"]
                                ].map(([key, label]) => (
                                    <th key={key} className="px-4 py-3 font-semibold">
                                        <button type="button" onClick={() => handleSort(key as SortKey)}>
                                            {label}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {sorted.map((record) => (
                                <tr key={`${record.store}:${record.sku}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-ink">{record.sku}</td>
                                    <td className="px-4 py-3 text-slate-700">{record.productName}</td>
                                    <td className="px-4 py-3 text-slate-600">{record.store}</td>
                                    <td className="px-4 py-3 text-slate-600">{record.category}</td>
                                    <td className="px-4 py-3 text-slate-700">{record.onHand}</td>
                                    <td className="px-4 py-3 text-slate-700">
                                        {formatCurrency(record.stockValue)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                                                record.abcClass === "A"
                                                    ? "bg-emerald-50 text-success"
                                                    : record.abcClass === "B"
                                                      ? "bg-amber-50 text-warning"
                                                      : "bg-rose-50 text-danger"
                                            }`}
                                        >
                                            {record.abcClass}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-pill px-3 py-1 text-xs font-semibold capitalize ${
                                                record.stockStatus === "healthy"
                                                    ? "bg-emerald-50 text-success"
                                                    : record.stockStatus === "warning"
                                                      ? "bg-amber-50 text-warning"
                                                      : "bg-rose-50 text-danger"
                                            }`}
                                        >
                                            {record.stockStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
}
