import { AUDIT_SECTIONS } from "./constants";
import type {
    AuditIssue,
    AuditMediaMeta,
    AuditProgress,
    AuditQuestion,
    AuditQuestionResponse,
    AuditScore,
    AuditSectionSummary,
    AuditSession,
    AuditStore,
} from "./types";

function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyAuditResponse(questionId: number): AuditQuestionResponse {
    return {
        questionId,
        answer: null,
        comment: "",
        mediaFiles: [],
        answeredAt: null,
    };
}

export function buildAuditResponses(questions: AuditQuestion[], existingResponses?: Record<number, AuditQuestionResponse>) {
    return questions.reduce<Record<number, AuditQuestionResponse>>((accumulator, question) => {
        const existing = existingResponses?.[question.id];
        accumulator[question.id] = existing
            ? {
                ...createEmptyAuditResponse(question.id),
                ...existing,
                mediaFiles: (existing.mediaFiles ?? []).map((media) => ({ ...media, objectUrl: media.objectUrl ?? null })),
            }
            : createEmptyAuditResponse(question.id);
        return accumulator;
    }, {});
}

export function createAuditSession(location: AuditStore, questions: AuditQuestion[], seed?: Partial<AuditSession>): AuditSession {
    return {
        id: seed?.id ?? createId(),
        locationCode: seed?.locationCode ?? location.code,
        locationName: seed?.locationName ?? location.name,
        location: seed?.location ?? location,
        startedAt: seed?.startedAt ?? new Date().toISOString(),
        completedAt: seed?.completedAt ?? null,
        responses: buildAuditResponses(questions, seed?.responses),
    };
}

export function calculateAuditScore(responses: Record<number, AuditQuestionResponse>, totalQuestions: number): AuditScore {
    let yes = 0;
    let no = 0;
    let na = 0;

    Object.values(responses).forEach((response) => {
        if (response.answer === "yes") {
            yes += 1;
        } else if (response.answer === "no") {
            no += 1;
        } else if (response.answer === "na") {
            na += 1;
        }
    });

    const answered = yes + no + na;
    const complianceBase = yes + no;

    return {
        yes,
        no,
        na,
        unanswered: Math.max(totalQuestions - answered, 0),
        compliance: complianceBase > 0 ? Math.round((yes / complianceBase) * 100) : 0,
    };
}

export function calculateAuditProgress(responses: Record<number, AuditQuestionResponse>, totalQuestions: number, minimumRequired: number): AuditProgress {
    const answered = Object.values(responses).filter((response) => response.answer !== null).length;

    return {
        answered,
        total: totalQuestions,
        percent: totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0,
        minimumRequired,
    };
}

export function getAuditSectionSummaries(questions: AuditQuestion[], responses: Record<number, AuditQuestionResponse>) {
    return AUDIT_SECTIONS.map<AuditSectionSummary>((section) => {
        const sectionQuestions = questions.filter((question) => question.id >= section.startId && question.id <= section.endId);
        const sectionResponses = sectionQuestions.reduce<Record<number, AuditQuestionResponse>>((accumulator, question) => {
            accumulator[question.id] = responses[question.id] ?? createEmptyAuditResponse(question.id);
            return accumulator;
        }, {});
        const score = calculateAuditScore(sectionResponses, sectionQuestions.length);
        const answered = sectionQuestions.filter((question) => sectionResponses[question.id]?.answer !== null).length;

        return {
            ...section,
            answered,
            total: sectionQuestions.length,
            percent: sectionQuestions.length > 0 ? Math.round((answered / sectionQuestions.length) * 100) : 0,
            score,
        };
    });
}

export function getAuditQuestionsBySection(questions: AuditQuestion[]) {
    return AUDIT_SECTIONS.map((section) => ({
        section,
        questions: questions.filter((question) => question.id >= section.startId && question.id <= section.endId),
    }));
}

export function getAuditIssues(questions: AuditQuestion[], responses: Record<number, AuditQuestionResponse>) {
    return questions.reduce<AuditIssue[]>((accumulator, question) => {
        const response = responses[question.id];
        if (response?.answer === "no") {
            accumulator.push({ question, response });
        }
        return accumulator;
    }, []);
}

export function getAuditScoreTone(compliance: number) {
    if (compliance >= 80) {
        return "text-success";
    }
    if (compliance >= 60) {
        return "text-warning";
    }
    return "text-danger";
}

export function getAuditScoreBarTone(compliance: number) {
    if (compliance >= 80) {
        return "bg-success";
    }
    if (compliance >= 60) {
        return "bg-warning";
    }
    return "bg-danger";
}

export function formatAuditDateTime(value: string | null) {
    if (!value) {
        return "Not completed yet";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function formatAuditDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function formatOpeningDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function formatFileSize(size: number) {
    if (size < 1024) {
        return `${size} B`;
    }
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function createDemoAuditSession(location: AuditStore, questions: AuditQuestion[]): AuditSession {
    const responses = questions.reduce<Record<number, AuditQuestionResponse>>((accumulator, question) => {
        let answer: AuditQuestionResponse["answer"] = "yes";
        let comment = "";
        let mediaFiles: AuditMediaMeta[] = [];

        if (question.id % 7 === 0) {
            answer = "no";
            comment = "Store condition does not meet the expected operating standard. Follow-up is required.";
        } else if (question.id % 9 === 0) {
            answer = "na";
        }

        if (question.id === 14 || question.id === 35) {
            mediaFiles = [{
                name: `finding-${question.id}.jpg`,
                type: "image/jpeg",
                size: 182000,
                createdAt: new Date().toISOString(),
                objectUrl: null,
            }];
        }

        accumulator[question.id] = {
            questionId: question.id,
            answer,
            comment,
            mediaFiles,
            answeredAt: new Date().toISOString(),
        };

        return accumulator;
    }, {});

    const startedAt = new Date(Date.now() - 1000 * 60 * 43).toISOString();
    const completedAt = new Date(Date.now() - 1000 * 60 * 11).toISOString();

    return {
        id: "audit-demo-session",
        locationCode: location.code,
        locationName: location.name,
        location,
        startedAt,
        completedAt,
        responses,
    };
}

export function buildAuditClipboardPayload(session: AuditSession, questions: AuditQuestion[], sections: AuditSectionSummary[], score: AuditScore) {
    return JSON.stringify(
        {
            location: session.location,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            summary: score,
            sections,
            issues: getAuditIssues(questions, session.responses).map((issue) => ({
                questionId: issue.question.id,
                question: issue.question.question,
                comment: issue.response.comment,
                mediaCount: issue.response.mediaFiles.length,
            })),
        },
        null,
        2
    );
}
