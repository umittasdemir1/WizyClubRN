import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface KPICardProps {
    label: string;
    value: string;
    detail: string;
    icon: ReactNode;
    tone: "brand" | "success" | "warning" | "danger";
}

const TONE_CLASS = {
    brand: "bg-brandSoft text-brand",
    success: "bg-emerald-50 text-success",
    warning: "bg-amber-50 text-warning",
    danger: "bg-rose-50 text-danger"
};

export function KPICard({ label, value, detail, icon, tone }: KPICardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-panel border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur-xl"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
                        {value}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{detail}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TONE_CLASS[tone]}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}
