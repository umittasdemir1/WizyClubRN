import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BrandSignature } from "../components/layout/BrandSignature";
import { StudioNav, type StudioModuleId } from "../studio/StudioNav";
import { LabsModule } from "../studio/modules/labs/LabsModule";
import { AtelierModule } from "../studio/modules/atelier/AtelierModule";
import { SenatoModule } from "../studio/modules/plus/SenatoModule";
import { LoyalModule } from "../studio/modules/loyal/LoyalModule";
import { isStudioHost } from "../utils/studio";

function resolveWorkspaceUrl(location: Pick<Location, "origin" | "protocol" | "hostname">) {
    if (isStudioHost(location.hostname)) {
        const rootHost = location.hostname.replace(/^studio\./, "");
        return rootHost ? `${location.protocol}//${rootHost}` : `${location.origin}/`;
    }
    return `${location.origin}/`;
}

export function StudioApp() {
    const [activeModule, setActiveModule] = useState<StudioModuleId>("labs");
    const workspaceUrl = useMemo(() => resolveWorkspaceUrl(window.location), []);

    return (
        <div className="relative isolate min-h-screen text-ink selection:bg-brandSelection selection:text-white">
            <div className="story-spectrum-bg">
                <div className="bg-grid-pattern" />
            </div>

            {/* Shell header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-2xl">
                <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-6 py-3 sm:px-10">
                    <BrandSignature onClick={() => window.location.assign(workspaceUrl)} />

                    <StudioNav active={activeModule} onChange={setActiveModule} />

                    <button
                        type="button"
                        onClick={() => window.location.assign(workspaceUrl)}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/55 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white/70 hover:text-ink"
                    >
                        Workspace
                        <ArrowUpRight className="h-3.5 w-3.5 text-brand" />
                    </button>
                </div>
            </header>

            {/* Module content */}
            <main className="relative z-10 pt-[65px]">
                {activeModule === "labs"    && <LabsModule workspaceUrl={workspaceUrl} />}
                {activeModule === "atelier" && <AtelierModule />}
                {activeModule === "senato"  && <SenatoModule />}
                {activeModule === "loyal"   && <LoyalModule />}
            </main>
        </div>
    );
}
