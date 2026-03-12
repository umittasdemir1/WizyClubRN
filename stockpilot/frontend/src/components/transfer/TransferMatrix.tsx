import { Card } from "../shared/Card";
import type { TransferSuggestion } from "../../types/stock";
import { formatNumber } from "../../utils/formatting";

interface TransferMatrixProps {
    transfers: TransferSuggestion[];
}

export function TransferMatrix({ transfers }: TransferMatrixProps) {
    return (
        <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Rebalancing
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Suggested warehouse-to-warehouse moves
                    </h3>
                </div>
                <p className="text-sm text-slate-500">
                    Prioritized by quantity needed at the destination warehouse.
                </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Product</th>
                            <th className="px-4 py-3 font-semibold">Variant</th>
                            <th className="px-4 py-3 font-semibold">Route</th>
                            <th className="px-4 py-3 font-semibold">Qty</th>
                            <th className="px-4 py-3 font-semibold">Demand Gap</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {transfers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    No clear rebalancing moves were found in this file.
                                </td>
                            </tr>
                        ) : (
                            transfers.map((transfer) => (
                                <tr
                                    key={`${transfer.productCode}:${transfer.fromWarehouseName}:${transfer.toWarehouseName}:${transfer.color}:${transfer.size}`}
                                >
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-ink">{transfer.productCode}</p>
                                            <p className="text-xs text-slate-500">{transfer.productName}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {transfer.color} · {transfer.size} · {transfer.gender}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {transfer.fromWarehouseName} → {transfer.toWarehouseName}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                        {formatNumber(transfer.quantity)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-ink">
                                        {formatNumber(transfer.demandGap)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
