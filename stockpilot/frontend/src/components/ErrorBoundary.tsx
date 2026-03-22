import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    context?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.context ? ` (${this.props.context})` : ""}]`, error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div
                    style={{
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        color: "#9ca3af",
                        fontSize: "14px"
                    }}
                >
                    <span>Something went wrong{this.props.context ? ` in ${this.props.context}` : ""}.</span>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "1px solid #374151",
                            background: "#1f2937",
                            color: "#e5e7eb",
                            cursor: "pointer",
                            fontSize: "13px"
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
