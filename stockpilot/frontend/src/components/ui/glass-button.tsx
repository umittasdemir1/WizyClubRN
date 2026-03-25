import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const glassButtonVariants = cva(
    "glass-button relative isolate cursor-pointer rounded-full transition-all",
    {
        variants: {
            size: {
                default: "text-[14px] font-semibold",
                sm: "text-[13px] font-medium",
                lg: "text-lg font-medium",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
);

const glassButtonTextVariants = cva(
    "glass-button-text relative block select-none tracking-tighter",
    {
        variants: {
            size: {
                default: "px-4 h-9 flex items-center",
                sm: "px-5 py-2.5",
                lg: "px-8 py-4",
                icon: "flex h-10 w-10 items-center justify-center",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
);

export interface GlassButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof glassButtonVariants> {
    contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ className, children, size, contentClassName, ...props }, ref) => {
        return (
            <div className={cn("glass-button-wrap cursor-pointer rounded-full", className)}>
                <button
                    className={cn(glassButtonVariants({ size }), "w-full")}
                    ref={ref}
                    {...props}
                >
                    <span className={cn(glassButtonTextVariants({ size }), "flex items-center justify-center", contentClassName)}>
                        {children}
                    </span>
                </button>
            </div>
        );
    }
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
