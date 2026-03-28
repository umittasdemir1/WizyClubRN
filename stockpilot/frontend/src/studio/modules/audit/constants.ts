export const AUDIT_SESSION_ACTIVE_KEY = "stockpilot.audit.active-session";
export const AUDIT_HISTORY_KEY = "stockpilot.audit.history";
export const AUDIT_HISTORY_LIMIT = 20;
export const AUDIT_MEDIA_LIMIT = 4;
export const AUDIT_MIN_COMPLETION_RATIO = 1.0;

export const AUDIT_SECTIONS = [
    { id: "general", title: "Entrance & General Environment", startId: 1, endId: 10 },
    { id: "merchandising", title: "Product Display & Merchandising", startId: 11, endId: 20 },
    { id: "customer", title: "Customer Experience", startId: 21, endId: 30 },
    { id: "staff", title: "Staff Performance", startId: 31, endId: 40 },
    { id: "operations", title: "Operations & Safety", startId: 41, endId: 50 },
] as const;

export const AUDIT_TABS = [
    { id: "checklist", label: "Checklist" },
    { id: "report", label: "Report" },
    { id: "history", label: "History" },
] as const;
