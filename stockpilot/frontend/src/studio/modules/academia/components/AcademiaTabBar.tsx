import { AudioLines, FileText, MessageSquareText } from "lucide-react";
import { DiscreteTabs, type DiscreteTabItem } from "../../../../components/ui/discrete-tab";
import type { AcademiaSidebarTab } from "../types";

interface Props {
    activeSidebarTab: AcademiaSidebarTab;
    onTabChange: (tab: AcademiaSidebarTab) => void;
}

const TABS: DiscreteTabItem<AcademiaSidebarTab>[] = [
    { id: "transcript", title: "Transcript", icon: AudioLines },
    { id: "notes", title: "Notes", icon: MessageSquareText },
    { id: "summary", title: "Summary", icon: FileText },
];

export function AcademiaTabBar({ activeSidebarTab, onTabChange }: Props) {
    return (
        <div className="flex h-[70px] shrink-0 items-center justify-center px-4">
            <DiscreteTabs
                tabs={TABS}
                activeTab={activeSidebarTab}
                onTabChange={onTabChange}
                className="justify-center gap-5"
            />
        </div>
    );
}
