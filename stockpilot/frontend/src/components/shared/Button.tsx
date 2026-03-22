import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
    variant?: ButtonVariant;
}

export function Button({
    children,
    className = "",
    variant = "primary",
    ...props
}: ButtonProps) {
    const variantClass =
        variant === "primary"
            ? "bg-ink text-white hover:bg-slate-800"
            : "bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50";

    return (
        <button
            className={`inline-flex items-center justify-center rounded-pill px-4 py-2.5 text-sm font-semibold transition ${variantClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
