import React, { useEffect, useRef, useState } from "react";
import {
    ChevronRight,
    EllipsisVertical,
    FilePlus,
    Folder,
    FolderPen,
    FolderPlus,
    FolderSync,
    X,
} from "lucide-react";
import { PIVOT_FIELD_TEXT_TYPOGRAPHY } from "./canvasModel";
import { usePivotStudio } from "./PivotStudioContext";
import type { UploadWorkflowResult } from "../../types/stock";

// ── File icon ──────────────────────────────────────────────────────────────────
const FILE_COLORS: Record<string, string> = {
    xlsx: "#16a34a",
    xls:  "#16a34a",
    csv:  "#2563eb",
    tsv:  "#7c3aed",
};

function FileDocIcon({ name, size = 22 }: { name: string; size?: number }) {
    const ext   = name.split(".").pop()?.toLowerCase() ?? "";
    const color = FILE_COLORS[ext] ?? "#64748b";
    const label = ext.toUpperCase().slice(0, 4);
    const w     = size;
    const h     = Math.round(size * 1.22);
    const fold  = Math.round(size * 0.32);
    return (
        <div className="relative shrink-0" style={{ width: w, height: h }}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                <path
                    d={`M0 4C0 1.79 1.79 0 4 0H${w - fold}L${w} ${fold}V${h - 4}C${w} ${h - 1.79} ${w - 1.79} ${h} ${w - 4} ${h}H4C1.79 ${h} 0 ${h - 1.79} 0 ${h - 4}V4Z`}
                    fill={color}
                />
                <path
                    d={`M${w - fold} 0L${w} ${fold}H${w - fold + 2}C${w - fold - 0.9} ${fold} ${w - fold} ${fold - 0.9} ${w - fold} ${fold - 2}V0Z`}
                    fill="rgba(0,0,0,0.18)"
                />
            </svg>
            <span
                className="absolute left-0 right-0 bottom-[4px] text-center font-medium text-white/95 select-none"
                style={{ fontSize: Math.round(size * 0.34), letterSpacing: "-0.02em" }}
            >
                {label}
            </span>
        </div>
    );
}

// ── Dataset Panel ──────────────────────────────────────────────────────────────
export interface DatasetPanelProps {
    explorerCollapsed: boolean;
    onToggleExplorer: () => void;
}

export function DatasetPanel({
    explorerCollapsed,
    onToggleExplorer,
}: DatasetPanelProps) {
    const {
        files,
        activeFileIdx,
        onSelectFile,
        onRemoveFile,
        onUploadClick,
        isUploading,
        uploadProgress,
        uploadStage,
        uploadError,
        currentFile,
    } = usePivotStudio();

    const [projectName, setProjectName] = useState<string>(() => {
        return localStorage.getItem("stockpilot-project-name") ?? "My Project";
    });
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(projectName);
    const [filesOpen, setFilesOpen] = useState(true);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [explorerActionsOpen, setExplorerActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);
    const explorerActionsRef = useRef<HTMLDivElement>(null);
    const rowMenuRef = useRef<HTMLDivElement>(null);

    // Folders
    const [folders, setFolders] = useState<{ id: string; name: string; open: boolean; fileIndices: number[] }[]>([]);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [folderDraft, setFolderDraft] = useState("");
    const [draggingFileIdx, setDraggingFileIdx] = useState<number | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [pendingUploadFolderId, setPendingUploadFolderId] = useState<string | null>(null);
    const prevFilesLenRef = useRef(files.length);

    // Rename
    const [fileDisplayNames, setFileDisplayNames] = useState<Record<number, string>>({});
    const [renamingTarget, setRenamingTarget] = useState<{ type: "file" | "folder"; id: string | number } | null>(null);
    const [renameDraft, setRenameDraft] = useState("");

    // Row ellipsis menu
    const [openRowMenu, setOpenRowMenu] = useState<{ type: "file" | "folder"; id: string | number } | null>(null);

    function openRename(type: "file" | "folder", id: string | number) {
        setOpenRowMenu(null);
        if (type === "file") {
            const idx = id as number;
            const fullName = fileDisplayNames[idx] ?? files[idx]?.parsed.fileName ?? "";
            const dotIdx = fullName.lastIndexOf(".");
            setRenameDraft(dotIdx > 0 ? fullName.slice(0, dotIdx) : fullName);
        } else {
            const folder = folders.find((f) => f.id === id);
            setRenameDraft(folder?.name ?? "");
        }
        setRenamingTarget({ type, id });
    }

    function commitRename() {
        if (!renamingTarget) return;
        const draft = renameDraft.trim();
        if (renamingTarget.type === "file") {
            const idx = renamingTarget.id as number;
            const originalName = files[idx]?.parsed.fileName ?? "";
            const dotIdx = originalName.lastIndexOf(".");
            const ext = dotIdx > 0 ? originalName.slice(dotIdx) : "";
            setFileDisplayNames((prev) => ({ ...prev, [idx]: (draft || originalName.replace(ext, "")) + ext }));
        } else {
            const id = renamingTarget.id as string;
            if (draft) setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: draft } : f));
        }
        setRenamingTarget(null);
        setRenameDraft("");
    }

    function commitFolder() {
        const name = folderDraft.trim();
        if (name) {
            setFolders((prev) => [...prev, { id: crypto.randomUUID(), name, open: true, fileIndices: [] }]);
        }
        setCreatingFolder(false);
        setFolderDraft("");
    }

    function toggleFolder(id: string) {
        setFolders((prev) => prev.map((f) => f.id === id ? { ...f, open: !f.open } : f));
    }

    useEffect(() => {
        if (pendingUploadFolderId && files.length > prevFilesLenRef.current) {
            moveFileToFolder(files.length - 1, pendingUploadFolderId);
            setPendingUploadFolderId(null);
        }
        prevFilesLenRef.current = files.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files.length]);

    function removeFolder(id: string) {
        setFolders((prev) => prev.filter((f) => f.id !== id));
    }

    function moveFileToFolder(fileIdx: number, folderId: string) {
        setFolders((prev) => prev.map((f) => ({
            ...f,
            fileIndices: f.id === folderId
                ? f.fileIndices.includes(fileIdx) ? f.fileIndices : [...f.fileIndices, fileIdx]
                : f.fileIndices.filter((i) => i !== fileIdx),
        })));
    }

    useEffect(() => {
        if (!actionsOpen) return;
        function handleClick(e: MouseEvent) {
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
                setActionsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [actionsOpen]);

    useEffect(() => {
        if (!explorerActionsOpen) return;
        function handleClick(e: MouseEvent) {
            if (explorerActionsRef.current && !explorerActionsRef.current.contains(e.target as Node)) {
                setExplorerActionsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [explorerActionsOpen]);

    useEffect(() => {
        if (!openRowMenu) return;
        function handle(e: MouseEvent) {
            if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
                setOpenRowMenu(null);
            }
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [openRowMenu]);

    function commitName() {
        const trimmed = nameDraft.trim() || "My Project";
        setProjectName(trimmed);
        localStorage.setItem("stockpilot-project-name", trimmed);
        setIsEditingName(false);
    }

    return (
        <aside className={`relative flex h-[calc(100vh-91px)] flex-col rounded-[12px] border border-slate-200/70 bg-white/80 shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl ${openRowMenu ? "" : "overflow-hidden"}`}>

            {/* ── Header block ── */}
            <div className="shrink-0 px-6 pt-6 pb-0">
                <div className="relative flex items-center justify-between pl-px" ref={explorerActionsRef}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Explorer
                    </p>
                    <button
                        type="button"
                        onClick={() => setExplorerActionsOpen((v) => !v)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 mr-[-15px]"
                        title="Explorer actions"
                    >
                        <EllipsisVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>

                    {explorerActionsOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-[10px] border border-slate-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]">
                            <button
                                type="button"
                                onClick={() => setExplorerActionsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FolderPlus className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                New project
                            </button>
                            <button
                                type="button"
                                onClick={() => setExplorerActionsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FolderSync className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                Change project
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative mt-1 flex items-center gap-1 pl-px" ref={actionsRef}>
                    <button
                        type="button"
                        onClick={() => setFilesOpen((v) => !v)}
                        className="absolute -left-[20px] flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-600"
                        title="Toggle files"
                    >
                        <ChevronRight className={`h-3 w-3 transition-transform duration-150 ${filesOpen ? "rotate-90" : ""}`} />
                    </button>

                    {isEditingName ? (
                        <input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={commitName}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitName();
                                if (e.key === "Escape") { setNameDraft(projectName); setIsEditingName(false); }
                            }}
                            className="min-w-0 flex-1 border-b border-slate-300 bg-transparent px-0 font-display text-[1.35rem] font-light leading-[1.15] tracking-tight text-ink outline-none"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setNameDraft(projectName); setIsEditingName(true); }}
                            className="min-w-0 flex-1 truncate rounded px-0 text-left font-display text-[1.35rem] font-light leading-[1.15] tracking-tight text-ink transition hover:opacity-70"
                            title="Rename project"
                        >
                            {projectName}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setActionsOpen((v) => !v)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 mr-[-15px]"
                        title="Actions"
                    >
                        <EllipsisVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>

                    {actionsOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-[10px] border border-slate-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]">
                            <button
                                type="button"
                                onClick={() => { onUploadClick(); setActionsOpen(false); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FilePlus className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                New file
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActionsOpen(false); setCreatingFolder(true); setFolderDraft(""); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FolderPlus className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                New folder
                            </button>
                            <button
                                type="button"
                                onClick={() => setActionsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <FolderSync className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                Sync
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── File list ── */}
            {filesOpen && <div className={`flex-1 py-1 ${openRowMenu ? "overflow-visible" : "overflow-y-auto"}`}>

                {(() => {
                    const folderedSet = new Set(folders.flatMap((f) => f.fileIndices));

                    function FileRow({ r, i, indent = false }: { r: UploadWorkflowResult; i: number; indent?: boolean }) {
                        const active = i === activeFileIdx && !isUploading;
                        const isRenaming = renamingTarget?.type === "file" && renamingTarget.id === i;
                        const displayName = fileDisplayNames[i] ?? r.parsed.fileName;
                        return (
                            <div
                                key={`${r.parsed.fileName}-${i}`}
                                className={`relative flex w-full items-center gap-2 rounded-none py-[5px] ${
                                    indent ? "pl-[3.5rem] pr-6" : "px-6"
                                } ${active ? "text-slate-900" : "text-slate-600"} ${
                                    draggingFileIdx === i ? "opacity-40" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDraggingFileIdx(i); }}
                                    onDragEnd={() => setDraggingFileIdx(null)}
                                    onClick={() => onSelectFile(i)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                    <FileDocIcon name={r.parsed.fileName} size={26} />
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        {isRenaming ? (
                                            <input
                                                autoFocus
                                                value={renameDraft}
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                onBlur={commitRename}
                                                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingTarget(null); }}
                                                onClick={(e) => e.stopPropagation()}
                                                className={`w-full border-b border-slate-300 bg-transparent outline-none ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                            />
                                        ) : (
                                            <p className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink ${active ? "!font-medium" : ""}`}>
                                                {displayName}
                                            </p>
                                        )}
                                        <p className={`font-display text-[0.72rem] leading-snug tracking-tight text-slate-400 ${active ? "font-medium" : "font-light"}`}>
                                            {r.parsed.rowCount.toLocaleString()} rows
                                        </p>
                                    </div>
                                </button>
                                <div className="relative shrink-0" ref={openRowMenu?.type === "file" && openRowMenu.id === i ? rowMenuRef : undefined}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setOpenRowMenu((prev) => prev?.type === "file" && prev.id === i ? null : { type: "file", id: i }); }}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 mr-[-15px]"
                                    >
                                        <EllipsisVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                                    </button>
                                    {openRowMenu?.type === "file" && openRowMenu.id === i && (
                                        <div className="absolute right-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-[10px] border border-slate-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]">
                                            <button type="button" onClick={() => openRename("file", i)} className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50 whitespace-nowrap">
                                                <FolderPen className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                                Rename
                                            </button>
                                            <button type="button" onClick={() => { onRemoveFile(i); setOpenRowMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-rose-500 transition hover:bg-slate-50 whitespace-nowrap">
                                                <X className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <>
                            {folders.map((folder) => {
                                const isDropTarget = dragOverFolderId === folder.id && draggingFileIdx !== null;
                                return (
                                    <div
                                        key={folder.id}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                                        onDragLeave={() => setDragOverFolderId(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggingFileIdx !== null) moveFileToFolder(draggingFileIdx, folder.id);
                                            setDragOverFolderId(null);
                                            setDraggingFileIdx(null);
                                        }}
                                        className={`transition-colors ${isDropTarget ? "bg-brand/5 rounded-[6px]" : ""}`}
                                    >
                                        <div className="group flex w-full items-center gap-1 px-3 py-[5px]">
                                            <button
                                                type="button"
                                                onClick={() => toggleFolder(folder.id)}
                                                className="flex min-w-0 flex-1 items-center gap-1 text-left transition hover:opacity-80"
                                            >
                                                <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-150 ${folder.open ? "rotate-90" : ""}`} />
                                                <Folder className={`h-[18px] w-[18px] shrink-0 transition-colors ${isDropTarget ? "text-brand" : "text-slate-400"}`} strokeWidth={1.5} />
                                                {renamingTarget?.type === "folder" && renamingTarget.id === folder.id ? (
                                                    <input
                                                        autoFocus
                                                        value={renameDraft}
                                                        onChange={(e) => setRenameDraft(e.target.value)}
                                                        onBlur={commitRename}
                                                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingTarget(null); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`min-w-0 flex-1 border-b border-slate-300 bg-transparent outline-none ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                    />
                                                ) : (
                                                    <p className={`${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}>{folder.name}</p>
                                                )}
                                            </button>
                                            <div className="relative shrink-0" ref={openRowMenu?.type === "folder" && openRowMenu.id === folder.id ? rowMenuRef : undefined}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setOpenRowMenu((prev) => prev?.type === "folder" && prev.id === folder.id ? null : { type: "folder", id: folder.id }); }}
                                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 mr-[-15px]"
                                                >
                                                    <EllipsisVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                </button>
                                                {openRowMenu?.type === "folder" && openRowMenu.id === folder.id && (
                                                    <div className="absolute right-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-[10px] border border-slate-200/80 bg-white shadow-[0_8px_24px_-8px_rgba(11,14,20,0.18)]">
                                                        <button type="button" onClick={() => openRename("folder", folder.id)} className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-slate-700 transition hover:bg-slate-50 whitespace-nowrap">
                                                            <FolderPen className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.5} />
                                                            Rename
                                                        </button>
                                                        <button type="button" onClick={() => { removeFolder(folder.id); setOpenRowMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-medium text-rose-500 transition hover:bg-slate-50 whitespace-nowrap">
                                                            <X className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {folder.open && folder.fileIndices.map((fi) =>
                                            files[fi] ? <React.Fragment key={fi}>{FileRow({ r: files[fi], i: fi, indent: true })}</React.Fragment> : null
                                        )}
                                    </div>
                                );
                            })}

                            {/* Creating folder inline row */}
                            {creatingFolder && (
                                <div className="flex items-center gap-1 px-3 py-[5px]">
                                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />
                                    <Folder className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.5} />
                                    <input
                                        autoFocus
                                        value={folderDraft}
                                        onChange={(e) => setFolderDraft(e.target.value)}
                                        onBlur={commitFolder}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") commitFolder();
                                            if (e.key === "Escape") { setCreatingFolder(false); setFolderDraft(""); }
                                        }}
                                        placeholder=""
                                        className={`min-w-0 flex-1 bg-transparent outline-none ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink placeholder:text-slate-300`}
                                    />
                                </div>
                            )}

                            {/* Unfoldered files */}
                            {files.map((r, i) => !folderedSet.has(i) && (
                                <React.Fragment key={i}>{FileRow({ r, i })}</React.Fragment>
                            ))}
                        </>
                    );
                })()}

                {/* Uploading row */}
                {isUploading && (
                    <div className="flex items-center gap-2 px-3 py-[5px]">
                        <FileDocIcon name={currentFile?.name ?? "file.xlsx"} size={18} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.76rem] font-medium leading-snug text-slate-700">
                                {currentFile?.name ?? "file"}
                            </p>
                            <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${uploadProgress}%`,
                                        background: "linear-gradient(to right,#FF416C,#FF9068,#FFD93D,#6BCF7F,#4D96FF,#FF416C)",
                                        backgroundSize: "200% auto",
                                        animation: "shimmer 3s linear infinite",
                                    }}
                                />
                            </div>
                            <p className="mt-0.5 text-[0.61rem] capitalize leading-tight text-slate-400">
                                {uploadStage} · {uploadProgress}%
                            </p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {files.length === 0 && !isUploading && (
                    <div className="px-3 py-6 text-center">
                        <p className="text-[0.71rem] text-slate-400">No files yet.</p>
                        <button
                            type="button"
                            onClick={onUploadClick}
                            className="mt-2 rounded border border-slate-200 bg-white px-3 py-1 text-[0.69rem] font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Upload a file
                        </button>
                    </div>
                )}

                {/* Error */}
                {uploadError && (
                    <p className="px-3 pt-1 text-[0.67rem] text-rose-500">{uploadError}</p>
                )}
            </div>}

        </aside>
    );
}
