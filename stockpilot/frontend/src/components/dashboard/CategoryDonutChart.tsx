import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../shared/Card";
import type { CategoryBreakdownPoint } from "../../types/stock";
import { formatCurrency } from "../../utils/formatting";

const COLORS = ["#246BFD", "#1FA971", "#F2B13F", "#9B8AFB", "#E45858", "#0EA5E9"];

interface CategoryDonutChartProps {
    data: CategoryBreakdownPoint[];
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
    return (
        <Card>
            <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Category Mix
                </p>
                <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                    Value concentration by category
                </h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                innerRadius={70}
                                outerRadius={104}
                                paddingAngle={4}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                    borderRadius: 16,
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(15,23,42,0.12)"
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                    {data.slice(0, 6).map((entry, index) => (
                        <div
                            key={entry.name}
                            className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <div>
                                    <p className="font-semibold text-ink">{entry.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {entry.quantity.toLocaleString()} units
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-slate-600">
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
