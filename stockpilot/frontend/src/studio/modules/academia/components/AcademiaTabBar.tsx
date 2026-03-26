import { AudioLines, NotebookPen, Sparkles } from "lucide-react";
import { Tabs3D, type Tab3DItem } from "../../../../components/ui/3d-icon-tabs";
import type { AcademiaSidebarTab } from "../types";

interface Props {
    activeSidebarTab: AcademiaSidebarTab;
    onTabChange: (tab: AcademiaSidebarTab) => void;
}

const TABS: Tab3DItem<AcademiaSidebarTab>[] = [
    { id: "transcript", label: "Transcript", icon: AudioLines },
    { id: "notes", label: "Notes", icon: NotebookPen },
    { id: "summary", label: "Summary", icon: Sparkles },
];

export function AcademiaTabBar({ activeSidebarTab, onTabChange }: Props) {
    return (
        <div className="flex h-[70px] shrink-0 items-center justify-center px-4">
            <Tabs3D
                tabs={TABS}
                activeTab={activeSidebarTab}
                onTabChange={onTabChange}
                className="justify-center"
            />
        </div>
    );
}
