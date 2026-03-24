import { useEffect, useMemo, useRef, useState } from "react";
import {
    type BaseEditor,
    type BaseRange,
    createEditor,
    type Descendant,
    Editor,
    Element as SlateElement,
    Node,
    type NodeEntry,
    Range,
    Text,
    Transforms,
} from "slate";
import {
    Editable,
    ReactEditor,
    type RenderElementProps,
    type RenderLeafProps,
    type RenderPlaceholderProps,
    Slate,
    withReact,
} from "slate-react";
import type { AcademiaTranscriptResult } from "../../../../types/academia";
import type { AcademiaNote } from "../types";
import { formatPlaybackTime, parseTimestampToSeconds } from "../utils";
import { TranscriptRangePicker } from "./TranscriptRangePicker";

const TIMESTAMP_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

type SummaryText = {
    text: string;
    timestamp?: boolean;
};

type SummaryParagraphElement = {
    type: "paragraph";
    children: SummaryText[];
};

type SummaryVisualNoteElement = {
    type: "visual-note";
    src: string;
    caption: string;
    capturedAtSeconds: number;
    children: SummaryText[];
};

type SummaryElement = SummaryParagraphElement | SummaryVisualNoteElement;

type TimestampRange = BaseRange & {
    timestamp?: boolean;
};

type SummarySlashCommandId = "today" | "now" | "screenshot" | "visual-notes" | "pinned" | "typewriter" | "transcript-original" | "transcript-translate";

type ActiveTranscriptRangePicker = {
    variant: "original" | "translate";
    startSeconds: number | null;
    endSeconds: number | null;
};

type SummarySlashCommand = {
    id: SummarySlashCommandId;
    label: string;
    keywords: string[];
    description: string;
};

type ActiveSlashMenu = {
    query: string;
    range: BaseRange;
};

type SummaryReferenceItem = {
    id: string;
    description: string;
    insertionText: string;
    screenshotDataUrl?: string;
    capturedAtSeconds?: number;
};

type ActiveReferenceMenu = {
    title: string;
    items: SummaryReferenceItem[];
    range: BaseRange;
};

type SummaryMenuPosition = {
    left: number;
    top: number;
};

declare module "slate" {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor;
        Element: SummaryElement;
        Text: SummaryText;
    }
}

interface Props {
    summaryDraft: string;
    cachedSlateValue: unknown[] | null;
    canSubmitSummary: boolean;
    visualNotes: AcademiaNote[];
    pinnedNotes: AcademiaNote[];
    writtenNotes: AcademiaNote[];
    onDraftChange: (value: string) => void;
    onSlateValueChange: (value: unknown[]) => void;
    onSeekToTime: (seconds: number) => void;
    onCaptureScreenshot: () => { screenshotDataUrl: string; capturedAtSeconds: number } | null;
    onSubmit: () => void;
    sourceTranscript: AcademiaTranscriptResult | null;
    translatedTranscript: AcademiaTranscriptResult | null;
    videoCurrentTime: number;
}

const SUMMARY_SLASH_COMMANDS: SummarySlashCommand[] = [
    {
        id: "today",
        label: "today",
        keywords: ["today", "date", "day"],
        description: "Insert today's date",
    },
    {
        id: "now",
        label: "now",
        keywords: ["now", "time", "clock"],
        description: "Insert current time",
    },
    {
        id: "screenshot",
        label: "screenshot",
        keywords: ["screenshot", "frame", "capture", "snap"],
        description: "Capture current frame",
    },
    {
        id: "visual-notes",
        label: "visual notes",
        keywords: ["visual", "visual notes", "screenshots", "captures"],
        description: "Pick a visual note",
    },
    {
        id: "pinned",
        label: "pinned",
        keywords: ["pinned", "pins", "timestamps"],
        description: "Pick a pinned note",
    },
    {
        id: "typewriter",
        label: "typewriter",
        keywords: ["typewriter", "notes", "written"],
        description: "Pick a typewriter note",
    },
    {
        id: "transcript-original",
        label: "transcript original",
        keywords: ["transcript", "original", "quote", "source"],
        description: "Quote from original transcript",
    },
    {
        id: "transcript-translate",
        label: "transcript translate",
        keywords: ["transcript", "translate", "turkish", "tr", "quote"],
        description: "Quote from Turkish transcript",
    },
];

function createSummaryValue(value: string): Descendant[] {
    const lines = value.split("\n");

    if (lines.length === 0) {
        return [{ type: "paragraph", children: [{ text: "" }] }];
    }

    return lines.map((line) => ({
        type: "paragraph",
        children: [{ text: line }],
    }));
}

function serializeSummaryValue(value: Descendant[]): string {
    return value.map((node) => {
        const element = node as SummaryElement;
        if (element.type === "visual-note") {
            return `[visual-note:${element.caption}]`;
        }
        return Node.string(node);
    }).join("\n");
}

function decorateTimestamp(entry: NodeEntry): TimestampRange[] {
    const [node, path] = entry;
    if (!Text.isText(node)) {
        return [];
    }

    const ranges: TimestampRange[] = [];
    for (const match of node.text.matchAll(TIMESTAMP_PATTERN)) {
        const matchedText = match[0];
        const startOffset = match.index ?? -1;
        if (startOffset < 0 || matchedText.length === 0) {
            continue;
        }

        ranges.push({
            anchor: { path, offset: startOffset },
            focus: { path, offset: startOffset + matchedText.length },
            timestamp: true,
        });
    }

    return ranges;
}

function VisualNoteElement({
    attributes,
    children,
    element,
    onSeekToTime,
}: RenderElementProps & { onSeekToTime: (seconds: number) => void }) {
    const ve = element as SummaryVisualNoteElement;

    return (
        <div
            {...attributes}
            className="my-2 rounded-[12px] p-1.5 text-slate-700"
            style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                lineHeight: "24px",
                fontWeight: 400,
            }}
        >
            <img
                src={ve.src}
                alt="Screenshot"
                className="rounded-[10px] object-cover cursor-pointer hover:opacity-80 transition-opacity"
                style={{ width: "75px", height: "75px", float: "left", marginRight: "10px", marginBottom: "4px" }}
                draggable={false}
                contentEditable={false}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onSeekToTime(ve.capturedAtSeconds);
                }}
            />
            {children}
        </div>
    );
}

function renderSummaryPlaceholder({ attributes, children }: RenderPlaceholderProps) {
    return (
        <span
            {...attributes}
            className="pointer-events-none text-slate-400"
            style={{
                ...(attributes.style ?? {}),
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                lineHeight: "24px",
                fontWeight: 400,
            }}
        >
            {children}
        </span>
    );
}

function formatTodayLabel() {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date());
}

function formatNowLabel() {
    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date());
}

function buildReferenceItem(note: AcademiaNote, prefix: string, index: number): SummaryReferenceItem {
    const timestamp = formatPlaybackTime(note.capturedAtSeconds);
    const rawBody = note.text.trim().length > 0
        ? note.text.trim()
        : prefix === "Visual"
            ? "Captured frame reference"
            : "Reference";

    const body = note.kind === "typewriter"
        ? rawBody
        : rawBody.startsWith(timestamp)
            ? rawBody
            : `${timestamp} ${rawBody}`.trim();

    return {
        id: note.id,
        description: body,
        insertionText: `[${prefix} ${index + 1}] ${body}`.trim(),
        screenshotDataUrl: note.screenshotDataUrl || undefined,
        capturedAtSeconds: note.capturedAtSeconds,
    };
}

function buildReferenceMenu(
    commandId: SummarySlashCommandId,
    range: BaseRange,
    visualNotes: AcademiaNote[],
    pinnedNotes: AcademiaNote[],
    writtenNotes: AcademiaNote[]
): ActiveReferenceMenu | null {
    if (commandId === "visual-notes") {
        return {
            title: "Visual Notes",
            items: visualNotes.map((note, index) => buildReferenceItem(note, "Visual", index)),
            range,
        };
    }

    if (commandId === "pinned") {
        return {
            title: "Pinned Notes",
            items: pinnedNotes.map((note, index) => buildReferenceItem(note, "Pinned", index)),
            range,
        };
    }

    if (commandId === "typewriter") {
        return {
            title: "Typewriter Notes",
            items: writtenNotes.map((note, index) => buildReferenceItem(note, "Typewriter", index)),
            range,
        };
    }

    return null;
}

function insertMultilineText(editor: ReactEditor, text: string) {
    const lines = text.split("\n");
    lines.forEach((line, index) => {
        if (index > 0) {
            Editor.insertBreak(editor);
        }
        if (line.length > 0) {
            Transforms.insertText(editor, line);
        }
    });
}

function getActiveSlashMenu(editor: ReactEditor): ActiveSlashMenu | null {
    const { selection } = editor;
    if (!selection || !Range.isCollapsed(selection)) {
        return null;
    }

    const currentNode = Node.get(editor, selection.anchor.path);
    if (!Text.isText(currentNode)) {
        return null;
    }

    const beforeText = currentNode.text.slice(0, selection.anchor.offset);
    const slashIndex = beforeText.lastIndexOf("/");
    if (slashIndex < 0) {
        return null;
    }

    const prefix = beforeText.slice(0, slashIndex);
    if (prefix.length > 0 && !/\s$/.test(prefix)) {
        return null;
    }

    const query = beforeText.slice(slashIndex + 1);
    if (/\n/.test(query)) {
        return null;
    }

    return {
        query,
        range: {
            anchor: { path: selection.anchor.path, offset: slashIndex },
            focus: selection.anchor,
        },
    };
}

function normalizeSlashQuery(value: string) {
    return value.trim().toLowerCase();
}

export function AcademiaSummaryPanel({
    summaryDraft,
    cachedSlateValue,
    canSubmitSummary,
    visualNotes,
    pinnedNotes,
    writtenNotes,
    onDraftChange,
    onSlateValueChange,
    onSeekToTime,
    onCaptureScreenshot,
    onSubmit,
    sourceTranscript,
    translatedTranscript,
    videoCurrentTime,
}: Props) {
    const [editor] = useState(() => {
        const e = withReact(createEditor());
        const { deleteBackward, insertBreak } = e;

        e.insertBreak = () => {
            const { selection } = e;
            if (selection && Range.isCollapsed(selection)) {
                const [vnMatch] = Editor.nodes(e, {
                    match: (n) => SlateElement.isElement(n) && n.type === "visual-note",
                });
                if (vnMatch) {
                    // Get text after cursor
                    const endOfVn = Editor.end(e, vnMatch[1]);
                    const afterRange = { anchor: selection.anchor, focus: endOfVn };
                    const afterText = Editor.string(e, afterRange);

                    // Delete text after cursor from visual-note
                    if (afterText.length > 0) {
                        Transforms.delete(e, { at: afterRange });
                    }

                    // Insert new paragraph after visual-note with the remaining text
                    const nextPath = [vnMatch[1][0] + 1];
                    Transforms.insertNodes(
                        e,
                        { type: "paragraph", children: [{ text: afterText }] },
                        { at: nextPath }
                    );
                    Transforms.select(e, { path: [...nextPath, 0], offset: 0 });
                    return;
                }
            }
            insertBreak();
        };

        e.deleteBackward = (unit) => {
            const { selection } = e;
            if (selection && Range.isCollapsed(selection)) {
                const [vnMatch] = Editor.nodes(e, {
                    match: (n) => SlateElement.isElement(n) && n.type === "visual-note",
                });
                if (vnMatch && selection.anchor.offset === 0 && Node.string(vnMatch[0]).trim() === "") {
                    Transforms.removeNodes(e, { at: vnMatch[1] });
                    return;
                }
            }
            deleteBackward(unit);
        };

        return e;
    });
    const [editorValue, setEditorValue] = useState<Descendant[]>(() =>
        cachedSlateValue ? (cachedSlateValue as Descendant[]) : createSummaryValue(summaryDraft)
    );
    const [isSavedVisible, setIsSavedVisible] = useState(false);
    const [activeSlashMenu, setActiveSlashMenu] = useState<ActiveSlashMenu | null>(null);
    const [activeReferenceMenu, setActiveReferenceMenu] = useState<ActiveReferenceMenu | null>(null);
    const [activeTranscriptPicker, setActiveTranscriptPicker] = useState<ActiveTranscriptRangePicker | null>(null);
    const [activeSlashIndex, setActiveSlashIndex] = useState(0);
    const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState<SummaryMenuPosition | null>(null);
    const resetSavedStateTimeoutRef = useRef<number | null>(null);
    const editorSurfaceRef = useRef<HTMLDivElement | null>(null);

    const filteredSlashCommands = useMemo(() => {
        if (!activeSlashMenu) return [];

        const available = SUMMARY_SLASH_COMMANDS.filter((cmd) => {
            if (cmd.id === "transcript-original") return sourceTranscript !== null;
            if (cmd.id === "transcript-translate") return translatedTranscript !== null;
            return true;
        });

        const normalizedQuery = normalizeSlashQuery(activeSlashMenu.query);
        if (!normalizedQuery) return available;

        return available.filter((command) => {
            const haystack = [command.label, ...command.keywords].join(" ").toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [activeSlashMenu, sourceTranscript, translatedTranscript]);

    useEffect(() => {
        setEditorValue((currentValue) => {
            // If current value has visual-note elements, don't overwrite with plain text
            const hasVisualNotes = currentValue.some(
                (node) => (node as SummaryElement).type === "visual-note"
            );
            if (hasVisualNotes) {
                return currentValue;
            }

            const currentText = serializeSummaryValue(currentValue);
            if (currentText === summaryDraft) {
                return currentValue;
            }

            return createSummaryValue(summaryDraft);
        });
    }, [summaryDraft]);

    useEffect(() => {
        if (filteredSlashCommands.length === 0) {
            setActiveSlashIndex(0);
            return;
        }

        setActiveSlashIndex((current) => Math.min(current, filteredSlashCommands.length - 1));
    }, [filteredSlashCommands]);

    useEffect(() => {
        if (!activeReferenceMenu || activeReferenceMenu.items.length === 0) {
            setActiveReferenceIndex(0);
            return;
        }

        setActiveReferenceIndex((current) => Math.min(current, activeReferenceMenu.items.length - 1));
    }, [activeReferenceMenu]);

    useEffect(() => {
        return () => {
            if (resetSavedStateTimeoutRef.current !== null) {
                window.clearTimeout(resetSavedStateTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const activeRange = activeReferenceMenu?.range ?? activeSlashMenu?.range;
        const surfaceElement = editorSurfaceRef.current;

        if (!activeRange || !surfaceElement) {
            setMenuPosition(null);
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            try {
                const [domNode, domOffset] = ReactEditor.toDOMPoint(editor, activeRange.anchor);
                const domRange = document.createRange();
                domRange.setStart(domNode, domOffset);
                domRange.setEnd(domNode, domOffset);
                const caretRect = domRange.getBoundingClientRect();
                const surfaceRect = surfaceElement.getBoundingClientRect();
                const menuWidth = activeReferenceMenu ? 320 : 280;
                const nextLeft = Math.min(
                    Math.max(caretRect.left - surfaceRect.left, 10),
                    Math.max(surfaceRect.width - menuWidth - 10, 10)
                );

                setMenuPosition({
                    left: nextLeft,
                    top: caretRect.bottom - surfaceRect.top + 10,
                });
            } catch {
                setMenuPosition(null);
            }
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [activeReferenceMenu, activeSlashMenu, editor]);

    function handleEditorChange(nextValue: Descendant[]) {
        setEditorValue(nextValue);
        onSlateValueChange(nextValue as unknown[]);
        setActiveSlashMenu(getActiveSlashMenu(editor));
        if (activeReferenceMenu) {
            setActiveReferenceMenu(null);
            setActiveReferenceIndex(0);
        }

        const nextText = serializeSummaryValue(nextValue);
        if (nextText !== summaryDraft) {
            onDraftChange(nextText);
        }
    }

    function handleSubmit() {
        if (!canSubmitSummary) {
            return;
        }

        onSubmit();
        setIsSavedVisible(true);

        if (resetSavedStateTimeoutRef.current !== null) {
            window.clearTimeout(resetSavedStateTimeoutRef.current);
        }

        resetSavedStateTimeoutRef.current = window.setTimeout(() => {
            setIsSavedVisible(false);
            resetSavedStateTimeoutRef.current = null;
        }, 1500);
    }

    function insertResolvedText(range: BaseRange, text: string) {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        if (text.length > 0) {
            insertMultilineText(editor, `"${text}"`);
            Transforms.insertText(editor, " ");
        }
        clearMenuState();
    }

    function insertVisualNoteBlock(range: BaseRange, item: SummaryReferenceItem) {
        Transforms.select(editor, range);
        Transforms.delete(editor);

        // Check if the current paragraph is now empty after deleting the slash command.
        // If so, replace it with the visual note; otherwise insert after.
        const [currentNodeEntry] = Editor.nodes(editor, {
            match: (n) => SlateElement.isElement(n) && n.type === "paragraph",
        });

        const captionText = item.description.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*/, "");
        const visualNoteNode: SummaryVisualNoteElement = {
            type: "visual-note",
            src: item.screenshotDataUrl!,
            caption: "",
            capturedAtSeconds: item.capturedAtSeconds ?? 0,
            children: [{ text: captionText }],
        };

        if (currentNodeEntry && Node.string(currentNodeEntry[0]).trim() === "") {
            // Replace empty paragraph with visual note
            Transforms.removeNodes(editor, { at: currentNodeEntry[1] });
            Transforms.insertNodes(editor, visualNoteNode, { at: currentNodeEntry[1] });
            // Add paragraph after and move cursor there
            const nextPath = [currentNodeEntry[1][0] + 1];
            Transforms.insertNodes(editor, { type: "paragraph", children: [{ text: "" }] }, { at: nextPath });
            Transforms.select(editor, Editor.end(editor, nextPath));
        } else {
            Transforms.insertNodes(editor, visualNoteNode);
            Transforms.insertNodes(editor, { type: "paragraph", children: [{ text: "" }] });
        }

        clearMenuState();
    }

    function clearMenuState() {
        setActiveSlashMenu(null);
        setActiveSlashIndex(0);
        setActiveReferenceMenu(null);
        setActiveReferenceIndex(0);
    }

    function executeSlashCommand(command: SummarySlashCommand) {
        if (!activeSlashMenu) {
            return;
        }

        if (command.id === "today") {
            insertResolvedText(activeSlashMenu.range, formatTodayLabel());
            return;
        }

        if (command.id === "now") {
            insertResolvedText(activeSlashMenu.range, formatNowLabel());
            return;
        }

        if (command.id === "screenshot") {
            const capture = onCaptureScreenshot();
            if (capture) {
                insertVisualNoteBlock(activeSlashMenu.range, {
                    id: `screenshot-${Date.now()}`,
                    description: "",
                    insertionText: "",
                    screenshotDataUrl: capture.screenshotDataUrl,
                    capturedAtSeconds: capture.capturedAtSeconds,
                });
            } else {
                insertResolvedText(activeSlashMenu.range, "");
            }
            return;
        }

        if (command.id === "transcript-original" || command.id === "transcript-translate") {
            const variant = command.id === "transcript-original" ? "original" : "translate";
            Transforms.select(editor, activeSlashMenu.range);
            Transforms.delete(editor);
            setActiveTranscriptPicker({ variant, startSeconds: null, endSeconds: null });
            setActiveSlashMenu(null);
            setActiveSlashIndex(0);
            return;
        }

        const referenceMenu = buildReferenceMenu(
            command.id,
            activeSlashMenu.range,
            visualNotes,
            pinnedNotes,
            writtenNotes
        );

        if (!referenceMenu) {
            return;
        }

        setActiveReferenceMenu(referenceMenu);
        setActiveReferenceIndex(0);
        setActiveSlashMenu(null);
        setActiveSlashIndex(0);
    }

    function insertTranscriptQuote() {
        if (!activeTranscriptPicker) return;
        const { variant, startSeconds, endSeconds } = activeTranscriptPicker;
        if (startSeconds === null || endSeconds === null) return;

        const transcript = variant === "original" ? sourceTranscript : translatedTranscript;
        if (!transcript) return;

        const start = Math.min(startSeconds, endSeconds);
        const end = Math.max(startSeconds, endSeconds);

        const text = transcript.cues
            .filter((cue) => cue.startSeconds < end && cue.endSeconds > start)
            .map((cue) => cue.text.trim())
            .join(" ");

        if (!text) return;

        ReactEditor.focus(editor);
        insertMultilineText(editor, `"${text}"\n${formatPlaybackTime(start)} – ${formatPlaybackTime(end)}`);
        Transforms.insertText(editor, " ");
        setActiveTranscriptPicker(null);
    }

    function handleSetTranscriptStart() {
        setActiveTranscriptPicker((prev) => prev ? { ...prev, startSeconds: videoCurrentTime } : null);
    }

    function handleSetTranscriptEnd() {
        setActiveTranscriptPicker((prev) => prev ? { ...prev, endSeconds: videoCurrentTime } : null);
    }

    function handleRenderElement(props: RenderElementProps) {
        if (props.element.type === "visual-note") {
            return <VisualNoteElement {...props} onSeekToTime={onSeekToTime} />;
        }

        return (
            <p
                {...props.attributes}
                className="m-0 whitespace-pre-wrap"
                style={{
                    fontFamily: "Poppins, sans-serif",
                    fontSize: "14px",
                    lineHeight: "24px",
                    fontWeight: 400,
                }}
            >
                {props.children}
            </p>
        );
    }

    function renderSummaryLeaf({ attributes, children, leaf }: RenderLeafProps) {
        if (!leaf.timestamp) {
            return <span {...attributes}>{children}</span>;
        }

        const timestampText = Text.isText(leaf) ? leaf.text : "";
        const timestampSeconds = parseTimestampToSeconds(timestampText);

        return (
            <span
                {...attributes}
                className="cursor-pointer font-medium text-sky-600"
                onMouseDown={(event) => {
                    if (timestampSeconds === null) {
                        return;
                    }

                    event.preventDefault();
                    onSeekToTime(timestampSeconds);
                }}
            >
                {children}
            </span>
        );
    }

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-white/96 px-6 pt-5 pb-0">
            <div className="min-h-0 flex-1 pb-[50px]">
                <div ref={editorSurfaceRef} className="relative flex h-full min-h-0 rounded-[12px] bg-slate-50/88">
                    <Slate editor={editor} initialValue={editorValue} onChange={handleEditorChange}>
                        <Editable
                            decorate={decorateTimestamp}
                            renderElement={handleRenderElement}
                            renderLeaf={renderSummaryLeaf}
                            renderPlaceholder={renderSummaryPlaceholder}
                            className="academia-scrollbar h-full min-h-0 w-full overflow-y-auto px-[5px] pb-[5px] pt-0 text-slate-700 outline-none"
                            style={{
                                fontFamily: "Poppins, sans-serif",
                                fontSize: "14px",
                                lineHeight: "24px",
                                fontWeight: 400,
                            }}
                            placeholder="Write your summary..."
                            spellCheck
                            onKeyDown={(event) => {
                                if (activeReferenceMenu) {
                                    if (activeReferenceMenu.items.length === 0) {
                                        if (event.key === "Escape") {
                                            event.preventDefault();
                                            setActiveReferenceMenu(null);
                                        }
                                        return;
                                    }

                                    if (event.key === "ArrowDown") {
                                        event.preventDefault();
                                        setActiveReferenceIndex((current) => (current + 1) % activeReferenceMenu.items.length);
                                        return;
                                    }

                                    if (event.key === "ArrowUp") {
                                        event.preventDefault();
                                        setActiveReferenceIndex((current) => (
                                            current - 1 + activeReferenceMenu.items.length
                                        ) % activeReferenceMenu.items.length);
                                        return;
                                    }

                                    if (event.key === "Enter" || event.key === "Tab") {
                                        event.preventDefault();
                                        const selectedItem = activeReferenceMenu.items[activeReferenceIndex];
                                        if (selectedItem.screenshotDataUrl) {
                                            insertVisualNoteBlock(activeReferenceMenu.range, selectedItem);
                                        } else {
                                            insertResolvedText(activeReferenceMenu.range, selectedItem.insertionText);
                                        }
                                        return;
                                    }

                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        setActiveReferenceMenu(null);
                                        setActiveReferenceIndex(0);
                                    }

                                    return;
                                }

                                if (!activeSlashMenu || filteredSlashCommands.length === 0) {
                                    return;
                                }

                                if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    setActiveSlashIndex((current) => (current + 1) % filteredSlashCommands.length);
                                    return;
                                }

                                if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    setActiveSlashIndex((current) => (
                                        current - 1 + filteredSlashCommands.length
                                    ) % filteredSlashCommands.length);
                                    return;
                                }

                                if (event.key === "Enter" || event.key === "Tab") {
                                    event.preventDefault();
                                    executeSlashCommand(filteredSlashCommands[activeSlashIndex]);
                                    return;
                                }

                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    setActiveSlashMenu(null);
                                    setActiveSlashIndex(0);
                                }
                            }}
                        />
                    </Slate>

                    {activeSlashMenu && filteredSlashCommands.length > 0 && menuPosition ? (
                        <div
                            className="absolute z-20 w-[280px] overflow-hidden rounded-[14px] border border-white/15 bg-slate-950/55 p-1.5 shadow-[0_22px_60px_-28px_rgba(2,6,23,0.72)] backdrop-blur-xl"
                            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
                        >
                            {filteredSlashCommands.map((command, index) => (
                                <button
                                    key={command.id}
                                    type="button"
                                    onMouseEnter={() => setActiveSlashIndex(index)}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        executeSlashCommand(command);
                                    }}
                                    className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-3 py-2 text-left transition ${
                                        index === activeSlashIndex
                                            ? "bg-white/12 text-white"
                                            : "text-slate-200 hover:bg-white/[0.07] hover:text-white"
                                    }`}
                                >
                                    <span className="text-[13px] font-medium">/{command.label}</span>
                                    <span
                                        className={`text-right text-[11px] transition ${
                                            index === activeSlashIndex ? "text-white/70" : "text-white/45 group-hover:text-white/70"
                                        }`}
                                    >
                                        {command.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {activeTranscriptPicker ? (
                        <TranscriptRangePicker
                            variant={activeTranscriptPicker.variant}
                            startSeconds={activeTranscriptPicker.startSeconds}
                            endSeconds={activeTranscriptPicker.endSeconds}
                            videoCurrentTime={videoCurrentTime}
                            transcript={activeTranscriptPicker.variant === "original" ? sourceTranscript : translatedTranscript}
                            onSetStart={handleSetTranscriptStart}
                            onSetEnd={handleSetTranscriptEnd}
                            onInsert={insertTranscriptQuote}
                            onCancel={() => setActiveTranscriptPicker(null)}
                        />
                    ) : null}

                    {activeReferenceMenu && menuPosition ? (
                        <div
                            className="absolute z-20 w-[280px] overflow-hidden rounded-[14px] border border-white/15 bg-slate-950/55 p-1.5 shadow-[0_22px_60px_-28px_rgba(2,6,23,0.72)] backdrop-blur-xl"
                            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
                        >
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                                {activeReferenceMenu.title}
                            </div>
                            {activeReferenceMenu.items.length > 0 ? (
                                activeReferenceMenu.items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseEnter={() => setActiveReferenceIndex(index)}
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            if (item.screenshotDataUrl) {
                                                insertVisualNoteBlock(activeReferenceMenu.range, item);
                                            } else {
                                                insertResolvedText(activeReferenceMenu.range, item.insertionText);
                                            }
                                        }}
                                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition ${
                                            index === activeReferenceIndex
                                                ? "bg-white/12 text-white"
                                                : "text-slate-200 hover:bg-white/[0.07] hover:text-white"
                                        }`}
                                    >
                                        {item.screenshotDataUrl ? (
                                            <img
                                                src={item.screenshotDataUrl}
                                                alt=""
                                                className="h-9 w-9 shrink-0 rounded-[5px] object-cover"
                                                draggable={false}
                                            />
                                        ) : null}
                                        <span className="block min-w-0 truncate text-[13px] font-medium">{item.description}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-3 text-[12px] text-white/45">
                                    No references available.
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="absolute bottom-[10px] right-6 flex justify-end">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmitSummary}
                    className="inline-flex h-9 min-w-[64px] items-center justify-center rounded-[12px] bg-slate-900 px-3 text-[13px] font-medium text-white shadow-[0_16px_34px_-22px_rgba(15,23,42,0.46)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Save summary"
                >
                    {isSavedVisible ? "Saved" : "Save"}
                </button>
            </div>
        </div>
    );
}
