import { motion } from "framer-motion";
import { ArrowUpDown, BarChart3, LayoutDashboard, Radar } from "lucide-react";
import type { AppTab } from "../../types/stock";

const TAB_LABELS: {
    id: AppTab;
    label: string;
    icon: typeof LayoutDashboard;
}[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
    { id: "transfers", label: "Transfers", icon: ArrowUpDown },
    { id: "planning", label: "Planning", icon: Radar }
];

interface TabNavProps {
    activeTab: AppTab;
    onChange: (tab: AppTab) => void;
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
    return (
        <div className="relative flex w-full max-w-5xl flex-wrap justify-center gap-3 rounded-[34px] border border-white/70 bg-white/75 p-3 shadow-panel backdrop-blur-xl">
            {TAB_LABELS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.id === activeTab;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`relative flex min-w-[170px] flex-1 items-center justify-center gap-3 rounded-[26px] px-6 py-4 text-base font-semibold transition sm:flex-none ${
                            active ? "text-brand" : "text-ink/75 hover:text-ink"
                        }`}
                    >
                        {active ? (
                            <motion.span
                                layoutId="active-tab"
                                className="absolute inset-0 rounded-[22px] bg-brandSoft"
                                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            />
                        ) : null}
                        <span className="relative z-10 flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
