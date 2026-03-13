import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { isStudioHost, isStudioPath } from "./utils/studio";

const queryClient = new QueryClient();
const WorkspaceApp = lazy(() => import("./App"));
const StudioSurface = lazy(() =>
    import("./pages/StudioApp").then((module) => ({ default: module.StudioApp }))
);

if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

const renderStudioSurface =
    isStudioHost(window.location.hostname) || isStudioPath(window.location.pathname);
const RootSurface = renderStudioSurface ? StudioSurface : WorkspaceApp;

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Suspense fallback={null}>
                <RootSurface />
            </Suspense>
        </QueryClientProvider>
    </React.StrictMode>
);
