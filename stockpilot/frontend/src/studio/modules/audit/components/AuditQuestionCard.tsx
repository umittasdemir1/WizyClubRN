import { AlertCircle, SquarePen, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AuditAnswer, AuditQuestion, AuditQuestionResponse } from "../types";
import { AuditMediaUpload } from "./AuditMediaUpload";

interface AuditQuestionCardProps {
    question: AuditQuestion;
    response: AuditQuestionResponse;
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
    { value: "yes", label: "Yes", activeClassName: "border-success bg-success/10 text-success" },
    { value: "no", label: "No", activeClassName: "border-danger bg-danger/10 text-danger" },
    { value: "na", label: "N/A", activeClassName: "border-line bg-slate-100 text-slate-600" },
];

export function AuditQuestionCard({ question, response, onAnswerChange, onCommentChange, onAddMedia, onRemoveMedia }: AuditQuestionCardProps) {
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [draftComment, setDraftComment] = useState(response.comment);

    useEffect(() => {
        if (!isCommentModalOpen) {
            setDraftComment(response.comment);
        }
    }, [isCommentModalOpen, response.comment]);

    function openCommentModal() {
        setDraftComment(response.comment);
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

    return (
        <>
            <motion.article
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5"
            >
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2.5">
                                <span className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {question.id}.
                                </span>
                                <h4 className="min-w-0 font-display text-[1rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.05rem]">
                                    {question.question}
                                </h4>
                            </div>
                        </div>
                        {response.answer === "no" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-danger">
                                <AlertCircle className="h-3 w-3" />
                                Flagged
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap gap-2 xl:min-w-[0] xl:max-w-none">
                            {ANSWERS.map((answerOption) => {
                                const isActive = response.answer === answerOption.value;

                                return (
                                    <button
                                        key={answerOption.value}
                                        type="button"
                                        onClick={() => onAnswerChange(answerOption.value)}
                                        className={`min-w-[54px] rounded-[8px] border px-2 py-1 text-sm font-semibold leading-none ${isActive ? answerOption.activeClassName : "border-line bg-white text-slate-500"}`}
                                    >
                                        {answerOption.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={openCommentModal}
                                aria-label="Edit comment"
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] border ${response.comment ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-500"}`}
                            >
                                <SquarePen className="h-4.5 w-4.5" />
                            </button>
                            <AuditMediaUpload mediaFiles={response.mediaFiles} onAddMedia={onAddMedia} onRemoveMedia={onRemoveMedia} />
                        </div>
                    </div>

                    {response.comment ? (
                        <p className="text-sm leading-5 text-slate-500">
                            {response.comment}
                        </p>
                    ) : null}
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
