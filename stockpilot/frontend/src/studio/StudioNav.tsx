import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";

export type StudioModuleId = "labs" | "atelier" | "academia" | "audit" | "senato" | "loyal";

interface NavModule {
    id: StudioModuleId;
    label: string;
    shortLabel: string;
    available: boolean;
}

const NAV_MODULES: NavModule[] = [
    { id: "labs",     label: "S+Labs",     shortLabel: "Labs",     available: true  },
    { id: "atelier",  label: "S+Atelier",  shortLabel: "Atelier",  available: true  },
    { id: "academia", label: "S+Academia", shortLabel: "Academia", available: true  },
    { id: "audit",    label: "S+Audit",    shortLabel: "Audit",    available: true  },
    { id: "senato",   label: "S+Senato",   shortLabel: "Senato",   available: false },
    { id: "loyal",    label: "S+Loyal",    shortLabel: "Loyal",    available: false },
];

interface StudioNavProps {
    active: StudioModuleId;
    onChange: (id: StudioModuleId) => void;
    variant?: "dark" | "light";
}

const AVAILABLE_MODULES = NAV_MODULES.filter((mod) => mod.available);

export function StudioNav({ active, onChange, variant = "dark" }: StudioNavProps) {
    const isLight = variant === "light";
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    function handleSelect(id: StudioModuleId) {
        onChange(id);
        setMenuOpen(false);
    }

    const activeModule = AVAILABLE_MODULES.find((m) => m.id === active);

    return (
        <>
            {/* ── Desktop nav (md+): horizontal pill tabs ── */}
            <nav className="hidden md:flex items-center gap-1.5">
                {AVAILABLE_MODULES.map((mod) => (
                    <button
                        key={mod.id}
                        type="button"
                        onClick={() => onChange(mod.id)}
                        className={`relative inline-flex h-9 items-center rounded-full px-4 text-[14px] font-semibold leading-none tracking-wide transition-all duration-200 ${
                            isLight
                                ? "liquid-glass-strong text-white"
                                : active === mod.id
                                    ? "bg-[#0b0e14] text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                        }`}
                        aria-current={active === mod.id ? "page" : undefined}
                    >
                        {mod.label}
                    </button>
                ))}
            </nav>

            {/* ── Mobile nav (<md): hamburger dropdown ── */}
            <div ref={menuRef} className="relative flex md:hidden">
                <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                        isLight
                            ? "liquid-glass-strong text-white"
                            : "bg-[#0b0e14] text-white shadow-sm"
                    }`}
                    aria-label="Open module menu"
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                {menuOpen && (
                    <div className={`absolute right-0 top-full mt-2 z-[100] min-w-[160px] overflow-hidden rounded-2xl ${
                        isLight
                            ? "bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.32)]"
                            : "border border-slate-100 bg-white shadow-xl"
                    }`}>
                        {AVAILABLE_MODULES.map((mod) => (
                            <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleSelect(mod.id)}
                                className={`flex w-full items-center px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                                    isLight
                                        ? active === mod.id
                                            ? "bg-white/20 text-white"
                                            : "text-white/80 hover:bg-white/10 hover:text-white"
                                        : active === mod.id
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {mod.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
