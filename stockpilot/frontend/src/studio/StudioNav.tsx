export type StudioModuleId = "labs" | "atelier" | "academia" | "senato" | "loyal";

interface NavModule {
    id: StudioModuleId;
    label: string;
    available: boolean;
}

const NAV_MODULES: NavModule[] = [
    { id: "labs",     label: "S+Labs",     available: true  },
    { id: "atelier",  label: "S+Atelier",  available: true  },
    { id: "academia", label: "S+Academia", available: true  },
    { id: "senato",   label: "S+Senato",   available: false },
    { id: "loyal",    label: "S+Loyal",    available: false },
];

interface StudioNavProps {
    active: StudioModuleId;
    onChange: (id: StudioModuleId) => void;
}

export function StudioNav({ active, onChange }: StudioNavProps) {
    return (
        <nav className="flex items-center gap-1.5">
            {NAV_MODULES.filter((mod) => mod.available).map((mod) => (
                <button
                    key={mod.id}
                    type="button"
                    onClick={() => onChange(mod.id)}
                    className={`relative inline-flex h-10 items-center gap-2 rounded-full px-5 text-[18px] font-semibold leading-none tracking-wide transition-all duration-200 ${
                        active === mod.id
                            ? "bg-[#0b0e14] text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                    }`}
                    aria-current={active === mod.id ? "page" : undefined}
                >
                    {mod.label}
                </button>
            ))}
        </nav>
    );
}
