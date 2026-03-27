export type AuditView = "landing" | "location-picker" | "checklist" | "report";
export type AuditSidebarTab = "checklist" | "report" | "history";
export type AuditAnswer = "yes" | "no" | "na" | null;

export interface AuditQuestion {
    id: number;
    question: string;
}

export interface AuditMediaMeta {
    name: string;
    type: string;
    size: number;
    createdAt: string;
    objectUrl?: string | null;
}

export interface AuditQuestionResponse {
    questionId: number;
    answer: AuditAnswer;
    comment: string;
    mediaFiles: AuditMediaMeta[];
    answeredAt: string | null;
}

export interface AuditStore {
    name: string;
    code: string;
    country: string;
    type: "Street" | "Mall";
    city: string;
    size_m2: number;
    opening_date: string;
    staff_count: number;
}

export interface AuditSession {
    id: string;
    locationCode: string;
    locationName: string;
    location: AuditStore;
    startedAt: string;
    completedAt: string | null;
    responses: Record<number, AuditQuestionResponse>;
}

export interface AuditProgress {
    answered: number;
    total: number;
    percent: number;
    minimumRequired: number;
}

export interface AuditScore {
    yes: number;
    no: number;
    na: number;
    unanswered: number;
    compliance: number;
}

export interface AuditSection {
    id: string;
    title: string;
    startId: number;
    endId: number;
}

export interface AuditSectionSummary extends AuditSection {
    answered: number;
    total: number;
    percent: number;
    score: AuditScore;
}

export interface AuditIssue {
    question: AuditQuestion;
    response: AuditQuestionResponse;
}
