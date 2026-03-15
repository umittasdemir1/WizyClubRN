export type StudioModuleId = "labs" | "atelier" | "senato" | "loyal";

interface NavModule {
    id: StudioModuleId;
    label: string;
    available: boolean;
}

const NAV_MODULES: NavModule[] = [
    { id: "labs",    label: "S+Labs",    available: true  },
    { id: "atelier", label: "S+Atelier", available: false },
    { id: "senato",  label: "S+Senato",  available: false },
    { id: "loyal",   label: "S+Loyal",   available: false },
];

interface StudioNavProps {
    active: StudioModuleId;
    onChange: (id: StudioModuleId) => void;
}

export function StudioNav({ active, onChange }: StudioNavProps) {
    return (
        <nav className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1.5 backdrop-blur-sm">
            {NAV_MODULES.map((mod) => (
                <button
                    key={mod.id}
                    type="button"
                    onClick={() => mod.available && onChange(mod.id)}
                    disabled={!mod.available}
                    className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${
                        active === mod.id
                            ? "bg-[#0b0e14] text-white shadow-sm"
                            : mod.available
                              ? "text-slate-600 hover:bg-slate-100 hover:text-ink"
                              : "cursor-not-allowed text-slate-300"
                    }`}
                    aria-current={active === mod.id ? "page" : undefined}
                >
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
