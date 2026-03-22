export type AcademiaRequestState = "idle" | "running" | "ready" | "error";
export type AcademiaSourceMode = "youtube" | "upload";
export type AcademiaSidebarTab = "transcript" | "notes" | "summary";

export type AcademiaNote = {
    id: string;
    capturedAtSeconds: number;
    createdAt: string;
    screenshotDataUrl: string;
    sourceName: string;
    text: string;
    isSaved: boolean;
    savedAt: string | null;
};

export type AcademiaComposerVisualDraft = {
    capturedAtSeconds: number;
    screenshotDataUrl: string;
    sourceName: string;
};
