import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { StudioApp } from "./pages/StudioApp";
import "./index.css";
import { isStudioHost, isStudioPath } from "./utils/studio";

const queryClient = new QueryClient();

if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

const renderStudioSurface =
    isStudioHost(window.location.hostname) || isStudioPath(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            {renderStudioSurface ? <StudioApp /> : <App />}
        </QueryClientProvider>
    </React.StrictMode>
);
