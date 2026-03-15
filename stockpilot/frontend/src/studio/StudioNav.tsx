import { BarChart2, Package, ShoppingBag, Users } from "lucide-react";
import type { ReactNode } from "react";

export type StudioModuleId = "labs" | "atelier" | "plus" | "loyal";

interface NavModule {
    id: StudioModuleId;
    label: string;
    icon: ReactNode;
    available: boolean;
}

const NAV_MODULES: NavModule[] = [
    { id: "labs",    label: "S+Labs",    icon: <BarChart2 className="h-3.5 w-3.5" />,    available: true  },
    { id: "atelier", label: "S+Atelier", icon: <Package className="h-3.5 w-3.5" />,      available: false },
    { id: "plus",    label: "S++",       icon: <ShoppingBag className="h-3.5 w-3.5" />,  available: false },
    { id: "loyal",   label: "S+Loyal",   icon: <Users className="h-3.5 w-3.5" />,        available: false },
];

interface StudioNavProps {
    active: StudioModuleId;
    onChange: (id: StudioModuleId) => void;
}

export function StudioNav({ active, onChange }: StudioNavProps) {
    return (
        <nav className="flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/70 p-1 backdrop-blur-sm">
            {NAV_MODULES.map((mod) => (
                <button
                    key={mod.id}
                    type="button"
                    onClick={() => mod.available && onChange(mod.id)}
                    disabled={!mod.available}
                    className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                        active === mod.id
                            ? "bg-[#0b0e14] text-white shadow-sm"
                            : mod.available
                              ? "text-slate-600 hover:bg-slate-100 hover:text-ink"
                              : "cursor-not-allowed text-slate-300"
                    }`}
                    aria-current={active === mod.id ? "page" : undefined}
                >
                    {mod.icon}
                    {mod.label}
                    {!mod.available && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-widest text-slate-400">
                            Soon
                        </span>
                    )}
                </button>
            ))}
        </nav>
    );
}
