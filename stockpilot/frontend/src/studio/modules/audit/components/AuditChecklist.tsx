import { ArrowLeft } from "lucide-react";
import type { AuditQuestion, AuditQuestionResponse, AuditStore } from "../types";
import { getAuditQuestionsBySection } from "../utils";
import { AuditQuestionCard } from "./AuditQuestionCard";
import { AuditSectionHeader } from "./AuditSectionHeader";

interface AuditChecklistProps {
    location: AuditStore;
    questions: AuditQuestion[];
    responses: Record<number, AuditQuestionResponse>;
    onBack: () => void;
    onAnswerChange: (questionId: number, answer: "yes" | "no" | "na" | null) => void;
    onCommentChange: (questionId: number, comment: string) => void;
    onAddMedia: (questionId: number, files: File[]) => void;
    onRemoveMedia: (questionId: number, index: number) => void;
}

export function AuditChecklist({
    location,
    questions,
    responses,
    onBack,
    onAnswerChange,
    onCommentChange,
    onAddMedia,
    onRemoveMedia,
}: AuditChecklistProps) {
    const groupedQuestions = getAuditQuestionsBySection(questions);

    return (
        <div className="flex min-h-full flex-col overflow-y-auto lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className="mb-4 px-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-500"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Change location
                </button>
            </div>

            <div className="space-y-4 pb-6">
                {groupedQuestions.map(({ section, questions: sectionQuestions }) => (
                    <section key={section.id} className="space-y-3">
                        <AuditSectionHeader title={section.title} />
                        <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-soft">
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
        </div>
    );
}
