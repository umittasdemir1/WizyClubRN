import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AuditQuestion, AuditQuestionResponse, AuditStore } from "../types";
import { getAuditQuestionsBySection } from "../utils";
import { AuditQuestionCard } from "./AuditQuestionCard";
import { AuditSectionHeader } from "./AuditSectionHeader";

interface AuditChecklistProps {
    location: AuditStore;
    questions: AuditQuestion[];
    responses: Record<number, AuditQuestionResponse>;
    canSubmit: boolean;
    onBack: () => void;
    onReset: () => void;
    onSubmit: () => void;
    onAnswerChange: (questionId: number, answer: "yes" | "no" | "na" | null) => void;
    onCommentChange: (questionId: number, comment: string) => void;
    onAddMedia: (questionId: number, files: File[]) => void;
    onRemoveMedia: (questionId: number, index: number) => void;
}

export function AuditChecklist({
    questions,
    responses,
    canSubmit,
    onBack,
    onReset,
    onSubmit,
    onAnswerChange,
    onCommentChange,
    onAddMedia,
    onRemoveMedia,
}: AuditChecklistProps) {
    const groupedQuestions = useMemo(() => getAuditQuestionsBySection(questions), [questions]);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<number[]>([]);

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
        <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-[#fcfdfe] [background-image:linear-gradient(to_right,rgba(226,232,240,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.5)_1px,transparent_1px)] [background-size:144px_144px] animate-[grid-wave_22s_ease-in-out_infinite]">
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
                    {groupedQuestions.map(({ section, questions: sectionQuestions }) => (
                        <section key={section.id} className="space-y-3">
                            <AuditSectionHeader title={section.title} />
                            <div className="overflow-hidden rounded-[14px] bg-white/96 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.34),0_18px_32px_-20px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:rounded-[16px]">
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
                    ))}
                </div>

                    <div className="mt-6 flex justify-center pb-2">
                        <div className="inline-flex rounded-full bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={onReset}
                                className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!canSubmit}
                                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                                    canSubmit
                                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
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
