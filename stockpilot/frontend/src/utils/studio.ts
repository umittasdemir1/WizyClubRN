import type { UploadWorkflowResult } from "../types/stock";

export const STUDIO_SYNC_MESSAGE = "stockpilot:studio-sync";

const LATEST_WORKFLOW_STORAGE_KEY = "stockpilot-latest-workflow";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const REWRITABLE_PREFIXES = new Set(["www", "app"]);

function isIpAddress(hostname: string): boolean {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

export function isStudioHost(hostname: string): boolean {
    return hostname.toLowerCase() === "studio" || hostname.toLowerCase().startsWith("studio.");
}

export function isStudioPath(pathname: string): boolean {
    return pathname === "/studio" || pathname.startsWith("/studio/");
}

export function resolveStudioUrl(location: Pick<Location, "origin" | "protocol" | "hostname">): string {
    const configuredUrl = import.meta.env.VITE_STOCKPILOT_STUDIO_URL?.trim();
    if (configuredUrl) {
        return configuredUrl;
    }

    if (
        LOCAL_HOSTNAMES.has(location.hostname) ||
        isIpAddress(location.hostname) ||
        location.hostname.endsWith(".local") ||
        location.hostname.endsWith(".netlify.app")
    ) {
        return `${location.origin}/studio`;
    }

    const hostnameParts = location.hostname.split(".").filter(Boolean);
    if (hostnameParts.length >= 2) {
        const baseParts = REWRITABLE_PREFIXES.has(hostnameParts[0])
            ? hostnameParts.slice(1)
            : hostnameParts;
        return `${location.protocol}//studio.${baseParts.join(".")}`;
    }

    return `${location.origin}/studio`;
}

export function getStudioTargetOrigin(studioUrl: string): string {
    try {
        return new URL(studioUrl, window.location.origin).origin;
    } catch {
        return window.location.origin;
    }
}

export function saveLatestWorkflowResult(value: UploadWorkflowResult | null) {
    try {
        if (!value) {
            window.localStorage.removeItem(LATEST_WORKFLOW_STORAGE_KEY);
            return;
        }

        window.localStorage.setItem(LATEST_WORKFLOW_STORAGE_KEY, JSON.stringify(value));
    } catch {
        return;
    }
}

export function loadLatestWorkflowResult(): UploadWorkflowResult | null {
    try {
        const raw = window.localStorage.getItem(LATEST_WORKFLOW_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as UploadWorkflowResult;
    } catch {
        window.localStorage.removeItem(LATEST_WORKFLOW_STORAGE_KEY);
        return null;
    }
}

export function isStudioSyncEnvelope(
    value: unknown
): value is { type: typeof STUDIO_SYNC_MESSAGE; payload: UploadWorkflowResult } {
    if (!value || typeof value !== "object") {
        return false;
    }

    const envelope = value as { type?: unknown; payload?: unknown };
    return envelope.type === STUDIO_SYNC_MESSAGE && !!envelope.payload;
}
