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
import type { AnalyzedInventoryRecord, PlanningPoint } from "../../types/stock";
import { formatNullableDate, formatNumber } from "../../utils/formatting";

interface ForecastChartProps {
    data: PlanningPoint[];
    records: AnalyzedInventoryRecord[];
}

export function ForecastChart({ data, records }: ForecastChartProps) {
    const slowMovers = records
        .filter((record) => record.lifecycleStatus !== "healthy")
        .sort((left, right) => {
            if (left.lifecycleStatus !== right.lifecycleStatus) {
                return left.lifecycleStatus === "stagnant" ? -1 : 1;
            }

            return right.inventory - left.inventory;
        })
        .slice(0, 6);

    return (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
                <div className="mb-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Planning
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Inventory and net sales by production year
                    </h3>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="planningFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#246BFD" stopOpacity={0.32} />
                                    <stop offset="95%" stopColor="#246BFD" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip
                                formatter={(value: number) => formatNumber(value)}
                                contentStyle={{
                                    borderRadius: 16,
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(15,23,42,0.12)"
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="inventory"
                                stroke="#246BFD"
                                strokeWidth={3}
                                fill="url(#planningFill)"
                            />
                            <Line
                                type="monotone"
                                dataKey="netSalesQty"
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
                        Attention List
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                        Slow and stagnant items
                    </h3>
                </div>

                <div className="mt-6 space-y-3">
                    {slowMovers.map((record) => (
                        <div
                            key={`${record.warehouseName}:${record.productCode}:${record.color}:${record.size}`}
                            className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-ink">{record.productName}</p>
                                    <p className="text-xs text-slate-500">
                                        {record.warehouseName} · {record.productCode}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                                        record.lifecycleStatus === "stagnant"
                                            ? "bg-rose-50 text-danger"
                                            : "bg-amber-50 text-warning"
                                    }`}
                                >
                                    {record.lifecycleStatus === "stagnant" ? "Stagnant" : "Slow"}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
                                <span>
                                    Inventory {formatNumber(record.inventory)} · Net sales {formatNumber(record.netSalesQty)}
                                </span>
                                <span>
                                    Last sale {formatNullableDate(record.lastSaleDate)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
