import { memo } from "react";
import { SpecialText } from "@/components/ui/special-text";

interface Props {
    visible: boolean;
}

export const AcademiaVideoSplash = memo(function AcademiaVideoSplash({ visible }: Props) {
    return (
        <div
            aria-hidden="true"
            className={[
                "absolute inset-0 z-[100] flex flex-col items-center justify-center",
                "bg-[#0a0a0a]",
                "transition-opacity duration-700 ease-in-out",
                visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            ].join(" ")}
        >
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)]" />

            <div className="relative flex flex-col items-center gap-6">
                <SpecialText className="text-2xl text-white/80 tracking-widest uppercase">
                    ACADEMIA
                </SpecialText>

                <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="h-1 w-1 rounded-full bg-white/30 animate-pulse"
                            style={{ animationDelay: `${i * 200}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});
