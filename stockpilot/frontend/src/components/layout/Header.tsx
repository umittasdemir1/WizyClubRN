import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { AppTab } from "../../types/stock";
import { BrandSignature } from "./BrandSignature";

interface HeaderProps {
    dataSource: "api" | "local" | null;
    onTabShortcut: (tab: AppTab) => void;
    onStudioLaunch: () => void;
}

export function Header({ dataSource, onTabShortcut, onStudioLaunch }: HeaderProps) {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        let rafId: number | null = null;

        const handleScroll = () => {
            // 4.7: Throttle scroll handler with requestAnimationFrame
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const currentScrollY = window.scrollY;
                const hero = document.getElementById("hero");
                const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;

                if (heroBottom > 120) {
                    setIsVisible(true);
                    lastScrollYRef.current = currentScrollY;
                    return;
                }

                if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
                    setIsVisible(false);
                } else {
                    setIsVisible(true);
                }

                lastScrollYRef.current = currentScrollY;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: "smooth"
            });
        }
    };

    const openWorkspaceTab = (tab: AppTab) => {
        onTabShortcut(tab);
        scrollToSection("workspace");
    };

    return (
        <header
            className={`fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            }`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 sm:px-12">
                <BrandSignature onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

                <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 lg:flex">
                    <button
                        onClick={() => scrollToSection("features")}
                        className="text-sm font-medium tracking-wide text-ink transition-colors hover:text-brand"
                    >
                        SOLUTIONS
                    </button>
                    <button
                        onClick={() => scrollToSection("upload")}
                        className="text-sm font-medium tracking-wide text-ink transition-colors hover:text-brand"
                    >
                        PLANNING
                    </button>
                    <button
                        onClick={() => openWorkspaceTab("dashboard")}
                        className="text-sm font-medium tracking-wide text-ink transition-colors hover:text-brand"
                    >
                        DASHBOARD
                    </button>
                    <button
                        onClick={onStudioLaunch}
                        className="studio-animated-border px-4 py-1.5 text-sm font-medium tracking-wide text-ink transition-colors hover:text-brand"
                    >
                        STUDIO
                    </button>
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 rounded-full border border-slate-100 bg-white/40 px-5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur sm:flex">
                        <ShieldCheck className={`h-4 w-4 ${dataSource ? "text-success" : "text-slate-300"}`} />
                        {dataSource ? "SECURE NODE" : "AWAITING NODE"}
                    </div>
                    <button
                        onClick={onStudioLaunch}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-100 bg-white/40 px-5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white/60 hover:text-ink"
                    >
                        TRY NOW
                        <ArrowRight className="h-4 w-4 text-brand" />
                    </button>
                </div>
            </div>
        </header>
    );
}
