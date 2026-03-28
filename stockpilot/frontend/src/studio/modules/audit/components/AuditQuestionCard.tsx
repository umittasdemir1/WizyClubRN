import { ChevronDown, Plus, SquarePen, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AuditAnswer, AuditQuestion, AuditQuestionResponse } from "../types";
import { AuditMediaUpload } from "./AuditMediaUpload";

interface AuditQuestionCardProps {
    question: AuditQuestion;
    response: AuditQuestionResponse;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onAnswerChange: (answer: AuditAnswer) => void;
    onCommentChange: (comment: string) => void;
    onAddMedia: (files: File[]) => void;
    onRemoveMedia: (index: number) => void;
}

const ANSWERS: Array<{
    value: Exclude<AuditAnswer, null>;
    label: string;
    activeClassName: string;
}> = [
    { value: "yes", label: "Yes", activeClassName: "bg-emerald-50 text-emerald-700 shadow-[0_0_7px_2px_rgba(16,185,129,0.22)]" },
    { value: "no", label: "No", activeClassName: "bg-rose-50 text-rose-700 shadow-[0_0_7px_2px_rgba(244,63,94,0.22)]" },
    { value: "na", label: "N/A", activeClassName: "bg-amber-50 text-amber-700 shadow-[0_0_7px_2px_rgba(245,158,11,0.22)]" },
];

export function AuditQuestionCard({
    question,
    response,
    isExpanded,
    onToggleExpanded,
    onAnswerChange,
    onCommentChange,
    onAddMedia,
    onRemoveMedia,
}: AuditQuestionCardProps) {
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [draftComment, setDraftComment] = useState(response.comment);

    useEffect(() => {
        if (!isCommentModalOpen) {
            setDraftComment(response.comment);
        }
    }, [isCommentModalOpen, response.comment]);

    function openCommentModal() {
        setDraftComment(response.comment);
        setIsActionMenuOpen(false);
        setIsCommentModalOpen(true);
    }

    function closeCommentModal() {
        setIsCommentModalOpen(false);
        setDraftComment(response.comment);
    }

    function saveComment() {
        onCommentChange(draftComment.trim());
        setIsCommentModalOpen(false);
    }

    const primaryMedia = response.mediaFiles[0] ?? null;
    const hasComment = response.comment.trim().length > 0;
    const hasMedia = Boolean(primaryMedia?.objectUrl);

    return (
        <>
            <motion.article
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="border-b border-line px-3.5 py-3.5 last:border-b-0 sm:px-5"
            >
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onToggleExpanded}
                            aria-label={isExpanded ? `Collapse question ${question.id}` : `Expand question ${question.id}`}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-[1rem] font-normal leading-none text-brand sm:h-10 sm:w-10 sm:text-[1.05rem]">
                                {question.id}
                            </span>
                            <h4 className="min-w-0 text-[1rem] font-normal leading-snug tracking-[-0.01em] text-ink sm:text-[1.05rem]">
                                {question.question}
                            </h4>
                        </button>

                        <motion.button
                            type="button"
                            onClick={onToggleExpanded}
                            aria-label={isExpanded ? `Collapse question ${question.id}` : `Expand question ${question.id}`}
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-700"
                        >
                            <ChevronDown className="h-4.5 w-4.5" />
                        </motion.button>
                    </div>

                    <AnimatePresence initial={false}>
                        {isExpanded ? (
                            <motion.div
                                key="question-body"
                                initial={{ height: 0, opacity: 0, y: -6 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -6 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-col gap-2.5 pt-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 max-w-full overflow-x-auto pr-2">
                                            <div className="inline-flex gap-1.5 rounded-full bg-slate-100 p-1">
                                                {ANSWERS.map((answerOption) => {
                                                    const isActive = response.answer === answerOption.value;

                                                    return (
                                                        <button
                                                            key={answerOption.value}
                                                            type="button"
                                                            onClick={() => onAnswerChange(answerOption.value)}
                                                            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                                                                isActive
                                                                    ? answerOption.activeClassName
                                                                    : "text-slate-500 hover:bg-white/70 hover:shadow-[0_1px_4px_rgba(15,23,42,0.10)]"
                                                            }`}
                                                        >
                                                            {answerOption.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2">
                                            <AnimatePresence initial={false}>
                                                {isActionMenuOpen ? (
                                                    <motion.div
                                                        initial={{ width: 0, opacity: 0, x: 12 }}
                                                        animate={{ width: "auto", opacity: 1, x: 0 }}
                                                        exit={{ width: 0, opacity: 0, x: 12 }}
                                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-1">
                                                            <button
                                                                type="button"
                                                                onClick={openCommentModal}
                                                                aria-label="Edit comment"
                                                                className="relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-[12px] font-medium text-slate-500 transition"
                                                            >
                                                                <SquarePen className="h-[18px] w-[18px]" />
                                                                {hasComment ? (
                                                                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                                                                ) : null}
                                                            </button>
                                                            <AuditMediaUpload
                                                                mediaFiles={response.mediaFiles}
                                                                onAddMedia={onAddMedia}
                                                                onRemoveMedia={onRemoveMedia}
                                                                showPreviews={false}
                                                                triggerClassName="h-[38px] w-[38px] rounded-full bg-white text-slate-500"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>

                                            <div className="inline-flex rounded-full bg-slate-100 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsActionMenuOpen((current) => !current)}
                                                    aria-label="Toggle actions"
                                                    className={`relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[12px] font-medium transition ${
                                                        isActionMenuOpen
                                                            ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                                                            : "text-slate-500"
                                                    }`}
                                                >
                                                    <Plus className="h-[18px] w-[18px]" />
                                                    {!isActionMenuOpen && (hasComment || hasMedia) ? (
                                                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                                                    ) : null}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {hasComment || hasMedia ? (
                                        <div className="flex min-h-[78px] flex-col gap-2.5 rounded-[18px] bg-slate-100 px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                            <div className="min-w-0 flex-1">
                                                {hasComment ? (
                                                    <p className="min-w-0 text-[14px] leading-5 text-slate-600 sm:hidden">
                                                        {response.comment}
                                                    </p>
                                                ) : null}

                                                <div className="mt-2 flex items-end justify-between gap-3 sm:mt-0 sm:items-center sm:justify-start sm:gap-2.5">
                                                    {hasMedia ? (
                                                        <div className="flex shrink-0 self-start items-center gap-1 px-0 sm:px-1.5">
                                                            {response.mediaFiles.map((media, index) => {
                                                                if (!media.objectUrl) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div
                                                                        key={`${media.name}-${media.createdAt}-${index}`}
                                                                        className="relative h-[74px] w-[74px] shrink-0"
                                                                    >
                                                                        {media.type.startsWith("image/") ? (
                                                                            <img
                                                                                src={media.objectUrl}
                                                                                alt={media.name}
                                                                                className="h-full w-full rounded-[12px] border border-white object-cover"
                                                                            />
                                                                        ) : media.type.startsWith("video/") ? (
                                                                            <video
                                                                                src={media.objectUrl}
                                                                                className="h-full w-full rounded-[12px] border border-white object-cover"
                                                                                muted
                                                                            />
                                                                        ) : null}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onRemoveMedia(index)}
                                                                            aria-label={`Remove ${media.name}`}
                                                                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-100 bg-white p-0 text-slate-500 shadow-[0_0_8px_2px_#f1f5f9] transition hover:text-slate-700"
                                                                        >
                                                                            <X className="block h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}

                                                    <div className="shrink-0 flex items-center gap-1.5 sm:hidden">
                                                        <button
                                                            type="button"
                                                            onClick={openCommentModal}
                                                            aria-label="Edit comment"
                                                            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-slate-700"
                                                        >
                                                            <SquarePen className="h-[18px] w-[18px]" />
                                                        </button>
                                                        {hasComment ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => onCommentChange("")}
                                                                aria-label="Delete comment"
                                                                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-rose-600"
                                                            >
                                                                <X className="h-[18px] w-[18px]" />
                                                            </button>
                                                        ) : null}
                                                    </div>

                                                    {hasComment ? (
                                                        <p className="hidden min-w-0 flex-1 text-[14px] leading-5 text-slate-600 sm:block">
                                                            {response.comment}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="hidden shrink-0 items-center gap-1.5 sm:flex sm:self-center">
                                                <button
                                                    type="button"
                                                    onClick={openCommentModal}
                                                    aria-label="Edit comment"
                                                    className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-slate-700"
                                                >
                                                    <SquarePen className="h-[18px] w-[18px]" />
                                                </button>
                                                {hasComment ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onCommentChange("")}
                                                        aria-label="Delete comment"
                                                        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-rose-600"
                                                    >
                                                        <X className="h-[18px] w-[18px]" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}

                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </motion.article>

            {isCommentModalOpen ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
                    <button
                        type="button"
                        aria-label="Close comment modal"
                        onClick={closeCommentModal}
                        className="absolute inset-0 bg-slate-950/25 backdrop-blur-sm"
                    />
                    <div className="relative z-10 w-full max-w-2xl rounded-[24px] border border-white/80 bg-white p-6 shadow-[0_36px_100px_-36px_rgba(15,23,42,0.45)] sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                                    Comment
                                </p>
                                <h3 className="mt-2 font-display text-[1.4rem] font-semibold tracking-tight text-ink">
                                    Question {question.id}
                                </h3>
                                <p className="mt-2 text-sm leading-7 text-slate-500">
                                    {question.question}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCommentModal}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-slate-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <textarea
                            value={draftComment}
                            onChange={(event) => setDraftComment(event.target.value)}
                            placeholder="Add observation, detail, or next action..."
                            rows={8}
                            className="mt-6 min-h-[220px] w-full rounded-[18px] border border-line bg-mist px-4 py-4 text-sm leading-7 text-ink outline-none"
                        />

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeCommentModal}
                                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveComment}
                                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
                            >
                                Save comment
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
