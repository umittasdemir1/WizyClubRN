import { useEffect, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { createEditor, type Descendant, Editor, Node, type NodeEntry, Text, Transforms } from "slate";
import {
    Editable,
    type RenderElementProps,
    type RenderLeafProps,
    type RenderPlaceholderProps,
    Slate,
    withReact,
} from "slate-react";
import type { AcademiaComposerVisualDraft } from "../types";
import { formatPlaybackTime } from "../utils";

const TIMESTAMP_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

interface Props {
    sidebarMessageDraft: string;
    composerVisualDraft: AcademiaComposerVisualDraft | null;
    canSubmitSidebarNote: boolean;
    onDraftChange: (value: string) => void;
    onClearVisualDraft: () => void;
    onSubmit: () => void;
}

function createNoteValue(value: string): Descendant[] {
    const lines = value.split("\n");

    if (lines.length === 0) {
        return [{ type: "paragraph", children: [{ text: "" }] }];
    }

    return lines.map((line) => ({
        type: "paragraph",
        children: [{ text: line }],
    }));
}

function serializeNoteValue(value: Descendant[]): string {
    return value.map((node) => Node.string(node)).join("\n");
}

function decorateTimestamp(entry: NodeEntry) {
    const [node, path] = entry;
    if (!Text.isText(node)) {
        return [];
    }

    return Array.from(node.text.matchAll(TIMESTAMP_PATTERN)).flatMap((match) => {
        const startOffset = match.index ?? -1;
        if (startOffset < 0 || match[0].length === 0) {
            return [];
        }

        return [{
            anchor: { path, offset: startOffset },
            focus: { path, offset: startOffset + match[0].length },
            timestamp: true,
        }];
    });
}

function renderNoteElement({ attributes, children }: RenderElementProps) {
    return (
        <p
            {...attributes}
            className="m-0 whitespace-pre-wrap"
            style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                lineHeight: "24px",
                fontWeight: 400,
            }}
        >
            {children}
        </p>
    );
}

function renderNoteLeaf({ attributes, children, leaf }: RenderLeafProps) {
    return (
        <span {...attributes} className={leaf.timestamp ? "font-medium text-sky-600" : undefined}>
            {children}
        </span>
    );
}

function renderNotePlaceholder({ attributes, children }: RenderPlaceholderProps) {
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

export function AcademiaNoteComposer({
    sidebarMessageDraft,
    composerVisualDraft,
    canSubmitSidebarNote,
    onDraftChange,
    onClearVisualDraft,
    onSubmit,
}: Props) {
    const [editor] = useState(() => withReact(createEditor()));
    const [editorValue, setEditorValue] = useState<Descendant[]>(() => createNoteValue(sidebarMessageDraft));

    useEffect(() => {
        const currentText = serializeNoteValue(editor.children as Descendant[]);
        if (currentText === sidebarMessageDraft) {
            return;
        }

        const nextValue = createNoteValue(sidebarMessageDraft);
        Editor.withoutNormalizing(editor, () => {
            editor.children = nextValue as typeof editor.children;
            const endPoint = Editor.end(editor, []);
            Transforms.select(editor, endPoint);
        });
        editor.onChange();
        setEditorValue(nextValue);
    }, [editor, sidebarMessageDraft]);

    function handleEditorChange(nextValue: Descendant[]) {
        setEditorValue(nextValue);
        const nextText = serializeNoteValue(nextValue);
        if (nextText !== sidebarMessageDraft) {
            onDraftChange(nextText);
        }
    }

    return (
        <div className="shrink-0 bg-white/96 px-6 pb-5 pt-0">
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/88 px-4 py-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
                <div className="relative">
                    <div className="flex items-start gap-3">
                        {composerVisualDraft ? (
                            <div className="relative -ml-[10px] -mt-[15px] h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] border border-slate-200 bg-slate-200">
                                <img
                                    src={composerVisualDraft.screenshotDataUrl}
                                    alt={`Draft capture at ${formatPlaybackTime(composerVisualDraft.capturedAtSeconds)}`}
                                    className="h-full w-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={onClearVisualDraft}
                                    className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(15,23,42,0.72)] text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.72)] transition hover:bg-[rgba(15,23,42,0.88)]"
                                    aria-label="Clear draft preview"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        ) : null}

                        <div className="w-full">
                            <Slate editor={editor} initialValue={editorValue} onChange={handleEditorChange}>
                                <Editable
                                    decorate={decorateTimestamp}
                                    renderElement={renderNoteElement}
                                    renderLeaf={renderNoteLeaf}
                                    renderPlaceholder={renderNotePlaceholder}
                                    className={`academia-scrollbar h-[150px] min-h-[150px] max-h-[150px] w-full overflow-y-auto px-[5px] pb-[5px] pt-0 text-slate-700 outline-none ${
                                        composerVisualDraft ? "pr-12" : ""
                                    }`}
                                    style={{
                                        fontFamily: "Poppins, sans-serif",
                                        fontSize: "14px",
                                        lineHeight: "24px",
                                        fontWeight: 400,
                                    }}
                                    placeholder="Start taking notes..."
                                    spellCheck
                                />
                            </Slate>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!canSubmitSidebarNote}
                        className="absolute -bottom-[15px] -right-[10px] inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-900 text-white shadow-[0_16px_34px_-22px_rgba(15,23,42,0.46)] transition"
                        aria-label="Save drafted note"
                    >
                        <ArrowUp className="h-5 w-5" strokeWidth={2.8} />
                    </button>
                </div>
            </div>
        </div>
    );
}
