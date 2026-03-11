import type { PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren {
    className?: string;
}

export function Card({ children, className = "" }: CardProps) {
    return (
        <section
            className={`rounded-panel border border-white/70 bg-white/80 p-6 shadow-panel backdrop-blur-xl ${className}`}
        >
            {children}
        </section>
    );
}
