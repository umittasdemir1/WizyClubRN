import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrandSignature } from "../components/layout/BrandSignature";
import { PivotStudioProvider } from "../components/canvas/PivotStudioContext";
import { Spinner } from "../components/shared/Spinner";
import { StudioNav, type StudioModuleId } from "../studio/StudioNav";
import { useStudioWorkflowState } from "../studio/useStudioWorkflowState";
import { isStudioHost } from "../utils/studio";
import { ErrorBoundary } from "../components/ErrorBoundary";

const LabsModule = lazy(async () => {
    const mod = await import("../studio/modules/labs/LabsModule");
    return { default: mod.LabsModule };
});

const AtelierModule = lazy(async () => {
    const mod = await import("../studio/modules/atelier/AtelierModule");
    return { default: mod.AtelierModule };
});

const AcademiaModule = lazy(async () => {
    const mod = await import("../studio/modules/academia/AcademiaModule");
    return { default: mod.AcademiaModule };
});

const SenatoModule = lazy(async () => {
    const mod = await import("../studio/modules/plus/SenatoModule");
    return { default: mod.SenatoModule };
});

const LoyalModule = lazy(async () => {
    const mod = await import("../studio/modules/loyal/LoyalModule");
    return { default: mod.LoyalModule };
});

function resolveWorkspaceUrl(location: Pick<Location, "origin" | "protocol" | "hostname">) {
    if (isStudioHost(location.hostname)) {
        const rootHost = location.hostname.replace(/^studio\./, "");
        return rootHost ? `${location.protocol}//${rootHost}` : `${location.origin}/`;
    }
    return `${location.origin}/`;
}

function StudioModuleFallback() {
    return (
        <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
            <Spinner />
        </div>
    );
}

export function StudioApp() {
    const [activeModule, setActiveModule] = useState<StudioModuleId>("atelier");
    const [academiaHasMedia, setAcademiaHasMedia] = useState(false);
    const workspaceUrl = useMemo(() => resolveWorkspaceUrl(window.location), []);
    const workflow = useStudioWorkflowState(workspaceUrl);

    // Lock body scroll while studio is mounted — prevents mobile page bounce/scroll
    useEffect(() => {
        document.body.classList.add("studio-page");
        return () => document.body.classList.remove("studio-page");
    }, []);

    const isAcademiaHero = activeModule === "academia" && !academiaHasMedia;

    return (
        <div className="relative isolate flex h-dvh flex-col overflow-hidden text-ink selection:bg-sky-200 selection:text-slate-900">
            <div className="story-spectrum-bg" />

            {/* Shell header */}
            <header className={`z-50 transition-colors duration-300 ${isAcademiaHero ? "absolute inset-x-0 top-0 border-b border-transparent bg-transparent" : "border-b border-ink/10 bg-white/60 backdrop-blur-2xl"}`}>
                <div className="relative mx-auto flex max-w-[1680px] h-[53px] items-center justify-between px-3 sm:px-6 md:px-10">
                    {/* Logo */}
                    <div className="relative z-10 shrink-0">
                        <BrandSignature onClick={() => window.location.assign(workspaceUrl)} variant={isAcademiaHero ? "light" : "dark"} />
                    </div>

                    {/* Nav — centered absolute on desktop, right side on mobile (handled inside StudioNav) */}
                    <div className="absolute inset-y-0 left-0 right-0 hidden md:flex items-center justify-center pointer-events-none">
                        <div className="pointer-events-auto">
                            <StudioNav active={activeModule} onChange={setActiveModule} variant={isAcademiaHero ? "light" : "dark"} />
                        </div>
                    </div>

                    {/* Mobile hamburger — only rendered <md */}
                    <div className="md:hidden">
                        <StudioNav active={activeModule} onChange={setActiveModule} variant={isAcademiaHero ? "light" : "dark"} />
                    </div>
                </div>
            </header>

            {/* Module content — fills remaining viewport height, NO scroll */}
            <main className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden">
                <input
                    ref={workflow.fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={workflow.handleFileInputChange}
                />

                <PivotStudioProvider value={workflow.contextValue}>
                    <Suspense fallback={<StudioModuleFallback />}>
                        <div className="h-full">
                            <ErrorBoundary context="Labs">
                                {activeModule === "labs" && <LabsModule />}
                            </ErrorBoundary>
                            <ErrorBoundary context="Atelier">
                                {activeModule === "atelier" && (
                                    <AtelierModule onOpenLabs={() => setActiveModule("labs")} />
                                )}
                            </ErrorBoundary>
                            <ErrorBoundary context="Academia">
                                {activeModule === "academia" && <AcademiaModule onHasMediaChange={setAcademiaHasMedia} />}
                            </ErrorBoundary>
                            <ErrorBoundary context="Senato">
                                {activeModule === "senato" && <SenatoModule />}
                            </ErrorBoundary>
                            <ErrorBoundary context="Loyal">
                                {activeModule === "loyal" && <LoyalModule />}
                            </ErrorBoundary>
                        </div>
                    </Suspense>
                </PivotStudioProvider>
            </main>
        </div>
    );
}
