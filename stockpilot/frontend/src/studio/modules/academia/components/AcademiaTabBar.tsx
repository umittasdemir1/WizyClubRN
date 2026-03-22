import { AudioLines, FileText, MessageSquareText, Upload } from "lucide-react";
import type { AcademiaSidebarTab } from "../types";

interface Props {
    activeSidebarTab: AcademiaSidebarTab;
    onTabChange: (tab: AcademiaSidebarTab) => void;
    onUploadClick: () => void;
}

const TABS: { id: AcademiaSidebarTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "transcript", label: "Transcript", Icon: AudioLines },
    { id: "notes", label: "Notes", Icon: MessageSquareText },
    { id: "summary", label: "Summary", Icon: FileText },
];

export function AcademiaTabBar({ activeSidebarTab, onTabChange, onUploadClick }: Props) {
    return (
        <div className="flex h-[56px] shrink-0 items-center px-4">
            {TABS.map(({ id, label, Icon }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onTabChange(id)}
                    className={`inline-flex items-center gap-1.5 rounded-[16px] px-3 py-1.5 text-[17.5px] font-medium leading-none transition-colors duration-150 ${
                        activeSidebarTab === id
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    }`}
                >
                    <Icon className="h-4 w-4" />
                    {label}
                </button>
            ))}

            <div className="ml-auto">
                <button
                    type="button"
                    onClick={onUploadClick}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Upload media"
                >
                    <Upload className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
