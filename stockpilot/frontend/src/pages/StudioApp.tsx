import { lazy, Suspense, useMemo, useState } from "react";
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
    const workspaceUrl = useMemo(() => resolveWorkspaceUrl(window.location), []);
    const workflow = useStudioWorkflowState(workspaceUrl);

    return (
        <div className="relative isolate min-h-screen text-ink selection:bg-brandSelection selection:text-white">
            <div className="story-spectrum-bg">
            </div>

            {/* Shell header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-2xl">
                <div className="relative mx-auto flex max-w-[1680px] items-center px-6 py-1.5 sm:px-10">
                    <div className="relative z-10">
                        <BrandSignature onClick={() => window.location.assign(workspaceUrl)} />
                    </div>

                    <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
                        <div className="pointer-events-auto">
                            <StudioNav active={activeModule} onChange={setActiveModule} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Module content */}
            <main className="relative z-10 pt-[53px]">
                <input
                    ref={workflow.fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={workflow.handleFileInputChange}
                />

                <PivotStudioProvider value={workflow.contextValue}>
                    <Suspense fallback={<StudioModuleFallback />}>
                        <ErrorBoundary context="Labs">
                            {activeModule === "labs" && <LabsModule />}
                        </ErrorBoundary>
                        <ErrorBoundary context="Atelier">
                            {activeModule === "atelier" && (
                                <AtelierModule onOpenLabs={() => setActiveModule("labs")} />
                            )}
                        </ErrorBoundary>
                        <ErrorBoundary context="Academia">
                            {activeModule === "academia" && <AcademiaModule />}
                        </ErrorBoundary>
                        <ErrorBoundary context="Senato">
                            {activeModule === "senato" && <SenatoModule />}
                        </ErrorBoundary>
                        <ErrorBoundary context="Loyal">
                            {activeModule === "loyal" && <LoyalModule />}
                        </ErrorBoundary>
                    </Suspense>
                </PivotStudioProvider>
            </main>
        </div>
    );
}
