import { Card } from "../shared/Card";
import type { TransferSuggestion } from "../../types/stock";
import { formatCurrency } from "../../utils/formatting";

interface TransferMatrixProps {
    transfers: TransferSuggestion[];
}

export function TransferMatrix({ transfers }: TransferMatrixProps) {
    return (
        <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Transfer Matrix
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Suggested surplus-to-deficit moves
                    </h3>
                </div>
                <p className="text-sm text-slate-500">
                    Prioritized by estimated stock value rescued.
                </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">SKU</th>
                            <th className="px-4 py-3 font-semibold">Route</th>
                            <th className="px-4 py-3 font-semibold">Qty</th>
                            <th className="px-4 py-3 font-semibold">Unit Price</th>
                            <th className="px-4 py-3 font-semibold">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {transfers.map((transfer) => (
                            <tr key={`${transfer.sku}:${transfer.fromStore}:${transfer.toStore}`}>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-ink">{transfer.sku}</p>
                                        <p className="text-xs text-slate-500">{transfer.productName}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    {transfer.fromStore} → {transfer.toStore}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{transfer.quantity}</td>
                                <td className="px-4 py-3 text-slate-700">
                                    {formatCurrency(transfer.unitPrice)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-ink">
                                    {formatCurrency(transfer.estimatedValue)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
