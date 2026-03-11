import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../shared/Card";
import type { StockHealthPoint } from "../../types/stock";

interface StockHealthChartProps {
    data: StockHealthPoint[];
}

export function StockHealthChart({ data }: StockHealthChartProps) {
    return (
        <Card>
            <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Stock Health
                </p>
                <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                    Healthy vs warning vs critical lines
                </h3>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: 16,
                                border: "none",
                                boxShadow: "0 10px 30px rgba(15,23,42,0.12)"
                            }}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {data.map((entry) => (
                                <Cell key={entry.name} fill={entry.tone} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
