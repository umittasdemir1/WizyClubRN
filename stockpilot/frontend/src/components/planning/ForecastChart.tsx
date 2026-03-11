import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Card } from "../shared/Card";
import type { AnalyzedInventoryRecord, ForecastPoint } from "../../types/stock";

interface ForecastChartProps {
    data: ForecastPoint[];
    records: AnalyzedInventoryRecord[];
}

export function ForecastChart({ data, records }: ForecastChartProps) {
    const purchaseCandidates = records
        .filter((record) => record.suggestedPurchase > 0)
        .sort((left, right) => right.suggestedPurchase - left.suggestedPurchase)
        .slice(0, 6);

    return (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
                <div className="mb-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Forecast
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Six-week demand vs reorder target
                    </h3>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#246BFD" stopOpacity={0.32} />
                                    <stop offset="95%" stopColor="#246BFD" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 16,
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(15,23,42,0.12)"
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="projectedDemand"
                                stroke="#246BFD"
                                strokeWidth={3}
                                fill="url(#forecastFill)"
                            />
                            <Line
                                type="monotone"
                                dataKey="reorderTarget"
                                stroke="#1FA971"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Purchase Queue
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Reorder suggestions
                    </h3>
                </div>

                <div className="mt-6 space-y-3">
                    {purchaseCandidates.map((record) => (
                        <div
                            key={`${record.store}:${record.sku}`}
                            className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-ink">{record.productName}</p>
                                    <p className="text-xs text-slate-500">
                                        {record.store} · {record.sku}
                                    </p>
                                </div>
                                <span className="rounded-pill bg-white px-3 py-1 text-xs font-semibold text-brand shadow-soft">
                                    Buy {Math.ceil(record.suggestedPurchase)}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                <span>Coverage: {record.coverageDays.toFixed(1)} days</span>
                                <span>Reorder point: {record.reorderPoint}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
