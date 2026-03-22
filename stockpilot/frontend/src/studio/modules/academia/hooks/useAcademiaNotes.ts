import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { readCachedNotes, writeCachedNotes } from "../cache";
import type { AcademiaComposerVisualDraft, AcademiaNote, AcademiaSidebarTab } from "../types";
import { buildAcademiaNoteId } from "../utils";

interface UseAcademiaNotesInput {
    mediaFile: File | null;
    videoCurrentTime: number;
    activeSidebarTab: AcademiaSidebarTab;
}

export interface UseAcademiaNotesResult {
    notesViewportRef: React.RefObject<HTMLDivElement>;
    visualNotesRailRef: React.RefObject<HTMLDivElement>;
    notes: AcademiaNote[];
    expandedNoteId: string | null;
    expandedNote: AcademiaNote | null;
    sidebarMessageDraft: string;
    composerVisualDraft: AcademiaComposerVisualDraft | null;
    visualNotes: AcademiaNote[];
    writtenNotes: AcademiaNote[];
    canSubmitSidebarNote: boolean;
    setSidebarMessageDraft: Dispatch<SetStateAction<string>>;
    setComposerVisualDraft: Dispatch<SetStateAction<AcademiaComposerVisualDraft | null>>;
    submitSidebarNote: () => void;
    openExpandedNote: (noteId: string) => void;
    closeExpandedNote: () => void;
    clearComposerVisualDraft: () => void;
    scrollVisualNotes: (direction: "left" | "right") => void;
}

export function useAcademiaNotes({
    mediaFile,
    videoCurrentTime,
    activeSidebarTab,
}: UseAcademiaNotesInput): UseAcademiaNotesResult {
    const notesViewportRef = useRef<HTMLDivElement>(null);
    const visualNotesRailRef = useRef<HTMLDivElement>(null);
    // Prevents writing back to localStorage during the initial hydration render.
    const hasHydratedNotesRef = useRef(false);

    const [notes, setNotes] = useState<AcademiaNote[]>([]);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [sidebarMessageDraft, setSidebarMessageDraft] = useState("");
    const [composerVisualDraft, setComposerVisualDraft] = useState<AcademiaComposerVisualDraft | null>(null);

    const visualNotes = useMemo(
        () => notes.filter((note) => note.screenshotDataUrl.trim().length > 0),
        [notes]
    );
    const writtenNotes = useMemo(
        () => notes.filter((note) => note.screenshotDataUrl.trim().length === 0 && note.text.trim().length > 0),
        [notes]
    );
    const expandedNote = useMemo(
        () => notes.find((note) => note.id === expandedNoteId) ?? null,
        [notes, expandedNoteId]
    );
    const canSubmitSidebarNote = composerVisualDraft !== null || sidebarMessageDraft.trim().length > 0;

    // Hydrate notes from localStorage when mediaFile changes.
    useEffect(() => {
        hasHydratedNotesRef.current = false;
        setExpandedNoteId(null);

        if (!mediaFile) {
            setNotes([]);
            setSidebarMessageDraft("");
            setComposerVisualDraft(null);
            return;
        }

        const cachedNotes = readCachedNotes(mediaFile.name);
        const cachedDraftNote = cachedNotes.find((note) => !note.isSaved) ?? null;

        setNotes(cachedNotes.filter((note) => note.isSaved));
        setSidebarMessageDraft(cachedDraftNote?.text ?? "");
        setComposerVisualDraft(
            cachedDraftNote && cachedDraftNote.screenshotDataUrl.trim().length > 0
                ? {
                      capturedAtSeconds: cachedDraftNote.capturedAtSeconds,
                      screenshotDataUrl: cachedDraftNote.screenshotDataUrl,
                      sourceName: cachedDraftNote.sourceName,
                  }
                : null
        );
    }, [mediaFile]);

    // Persist notes to localStorage, skipping the initial hydration pass.
    useEffect(() => {
        if (!mediaFile) {
            return;
        }

        if (!hasHydratedNotesRef.current) {
            hasHydratedNotesRef.current = true;
            return;
        }

        const hasComposerDraft =
            composerVisualDraft !== null || sidebarMessageDraft.trim().length > 0;
        const persistedNotes = hasComposerDraft
            ? [
                  {
                      id: "academia_note_draft",
                      capturedAtSeconds: composerVisualDraft?.capturedAtSeconds ?? videoCurrentTime,
                      createdAt: new Date().toISOString(),
                      screenshotDataUrl: composerVisualDraft?.screenshotDataUrl ?? "",
                      sourceName: composerVisualDraft?.sourceName ?? mediaFile.name,
                      text: sidebarMessageDraft,
                      isSaved: false,
                      savedAt: null,
                  },
                  ...notes,
              ]
            : notes;

        writeCachedNotes(mediaFile.name, persistedNotes);
    }, [mediaFile, notes, sidebarMessageDraft, composerVisualDraft, videoCurrentTime]);

    // Scroll notes viewport to top when switching to notes tab or when new notes arrive.
    useEffect(() => {
        if (activeSidebarTab !== "notes") {
            return;
        }
        notesViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeSidebarTab, notes.length]);

    // Close expanded note with Escape key.
    useEffect(() => {
        if (!expandedNoteId) {
            return;
        }

        if (!expandedNote) {
            setExpandedNoteId(null);
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setExpandedNoteId(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [expandedNote, expandedNoteId]);

    function submitSidebarNote() {
        const trimmedMessage = sidebarMessageDraft.trim();
        if (!composerVisualDraft && trimmedMessage.length === 0) {
            return;
        }

        const nextTimestamp = new Date().toISOString();
        const nextNote: AcademiaNote = {
            id: buildAcademiaNoteId(),
            capturedAtSeconds: composerVisualDraft?.capturedAtSeconds ?? videoCurrentTime,
            createdAt: nextTimestamp,
            screenshotDataUrl: composerVisualDraft?.screenshotDataUrl ?? "",
            sourceName: composerVisualDraft?.sourceName ?? mediaFile?.name ?? "Academia note",
            text: trimmedMessage,
            isSaved: true,
            savedAt: nextTimestamp,
        };

        setNotes((current) => [nextNote, ...current]);
        setSidebarMessageDraft("");
        setComposerVisualDraft(null);
    }

    function scrollVisualNotes(direction: "left" | "right") {
        visualNotesRailRef.current?.scrollBy({
            left: direction === "left" ? -96 : 96,
            behavior: "smooth",
        });
    }

    return {
        notesViewportRef,
        visualNotesRailRef,
        notes,
        expandedNoteId,
        expandedNote,
        sidebarMessageDraft,
        composerVisualDraft,
        visualNotes,
        writtenNotes,
        canSubmitSidebarNote,
        setSidebarMessageDraft,
        setComposerVisualDraft,
        submitSidebarNote,
        openExpandedNote: (noteId) => setExpandedNoteId(noteId),
        closeExpandedNote: () => setExpandedNoteId(null),
        clearComposerVisualDraft: () => setComposerVisualDraft(null),
        scrollVisualNotes,
    };
}
