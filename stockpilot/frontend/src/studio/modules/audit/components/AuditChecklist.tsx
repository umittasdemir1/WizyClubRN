import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuditQuestion, AuditQuestionResponse, AuditStore } from "../types";
import { getAuditQuestionsBySection, getAuditSectionSummaries } from "../utils";
import { AuditQuestionCard } from "./AuditQuestionCard";
import { AuditSectionHeader } from "./AuditSectionHeader";

interface AuditChecklistProps {
    location: AuditStore;
    questions: AuditQuestion[];
    responses: Record<number, AuditQuestionResponse>;
    canSubmit: boolean;
    onBack: () => void;
    onReset: () => void;
    onSaveDraft: () => void;
    onSubmit: () => void;
    onAnswerChange: (questionId: number, answer: "yes" | "no" | "na" | null) => void;
    onCommentChange: (questionId: number, comment: string) => void;
    onAddMedia: (questionId: number, files: File[]) => void;
    onRemoveMedia: (questionId: number, index: number) => void;
    onHeaderHiddenChange?: (hidden: boolean) => void;
}

export function AuditChecklist({
    questions,
    responses,
    canSubmit,
    onBack,
    onReset,
    onSaveDraft,
    onSubmit,
    onAnswerChange,
    onCommentChange,
    onAddMedia,
    onRemoveMedia,
    onHeaderHiddenChange,
}: AuditChecklistProps) {
    const groupedQuestions = useMemo(() => getAuditQuestionsBySection(questions), [questions]);
    const sectionSummaries = useMemo(() => getAuditSectionSummaries(questions, responses), [questions, responses]);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<number[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastScrollTop = useRef(0);
    const headerHiddenRef = useRef(false);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        const scrollTop = el.scrollTop;
        const delta = scrollTop - lastScrollTop.current;
        lastScrollTop.current = scrollTop;

        // Show header when near top
        if (scrollTop < 48) {
            if (headerHiddenRef.current) {
                headerHiddenRef.current = false;
                onHeaderHiddenChange?.(false);
            }
            return;
        }

        // Hide on scroll down, show on scroll up (with threshold to avoid jitter)
        if (delta > 4 && !headerHiddenRef.current) {
            headerHiddenRef.current = true;
            onHeaderHiddenChange?.(true);
        } else if (delta < -4 && headerHiddenRef.current) {
            headerHiddenRef.current = false;
            onHeaderHiddenChange?.(false);
        }
    }, [onHeaderHiddenChange]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    // Reset header visibility when unmounting
    useEffect(() => {
        return () => onHeaderHiddenChange?.(false);
    }, [onHeaderHiddenChange]);

    useEffect(() => {
        if (questions.length === 0) {
            setExpandedQuestionIds([]);
            return;
        }

        setExpandedQuestionIds((current) => {
            const validIds = current.filter((questionId) => questions.some((question) => question.id === questionId));
            if (validIds.length > 0) {
                return validIds;
            }

            return [questions[0].id];
        });
    }, [questions]);

    useEffect(() => {
        const nextQuestion = questions.find((question) => responses[question.id]?.answer === null);
        if (!nextQuestion) {
            return;
        }

        setExpandedQuestionIds((current) => (
            current.includes(nextQuestion.id) ? current : [...current, nextQuestion.id]
        ));
    }, [questions, responses]);

    function toggleQuestion(questionId: number) {
        setExpandedQuestionIds((current) => (
            current.includes(questionId)
                ? current.filter((id) => id !== questionId)
                : [...current, questionId]
        ));
    }

    return (
        <div ref={scrollRef} className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-[#fcfdfe] [background-image:linear-gradient(to_right,rgba(226,232,240,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.5)_1px,transparent_1px)] [background-size:144px_144px] animate-[grid-wave_22s_ease-in-out_infinite]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-[10%] -top-[20%] h-[70%] w-[60%] animate-[float-bg_20s_infinite_alternate_ease-in-out] bg-[radial-gradient(circle,rgba(255,65,108,0.05)_0%,transparent_70%)] blur-[100px]" />
                <div className="absolute -bottom-[10%] -right-[5%] h-[60%] w-[50%] animate-[float-bg_25s_infinite_alternate-reverse_ease-in-out] bg-[radial-gradient(circle,rgba(77,150,255,0.04)_0%,transparent_70%)] blur-[120px]" />
            </div>

            <div className="relative mx-auto flex min-h-full w-full max-w-[980px] flex-col px-4 pb-6 pt-4 sm:px-5 md:px-6 lg:px-8">
                <div className="relative z-10 flex flex-1 flex-col">
                <div className="mb-4 flex items-center justify-start gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Go back"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-slate-500 transition hover:text-slate-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    {groupedQuestions.map(({ section, questions: sectionQuestions }) => {
                        const summary = sectionSummaries.find((s) => s.id === section.id);
                        return (
                        <section key={section.id}>
                            <div className="overflow-clip rounded-[14px] bg-white/96 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.34),0_18px_32px_-20px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[16px]">
                            <AuditSectionHeader
                                title={section.title}
                                answered={summary?.answered ?? 0}
                                total={summary?.total ?? sectionQuestions.length}
                                yes={summary?.score.yes ?? 0}
                                no={summary?.score.no ?? 0}
                                na={summary?.score.na ?? 0}
                            />
                                {sectionQuestions.map((question) => {
                                    const response = responses[question.id];
                                    if (!response) {
                                        return null;
                                    }

                                    return (
                                        <AuditQuestionCard
                                            key={question.id}
                                            question={question}
                                            response={response}
                                            isExpanded={expandedQuestionIds.includes(question.id)}
                                            onToggleExpanded={() => toggleQuestion(question.id)}
                                            onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
                                            onCommentChange={(comment) => onCommentChange(question.id, comment)}
                                            onAddMedia={(files) => onAddMedia(question.id, files)}
                                            onRemoveMedia={(index) => onRemoveMedia(question.id, index)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                        );
                    })}
                </div>

                    <div className="mt-8 flex justify-center pb-4">
                        <div className="inline-flex rounded-full bg-slate-100 p-1.5">
                            <button
                                type="button"
                                onClick={onReset}
                                className="whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={onSaveDraft}
                                className="whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                            >
                                Draft
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!canSubmit}
                                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium transition ${
                                    canSubmit
                                        ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                                        : "text-slate-400"
                                }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
