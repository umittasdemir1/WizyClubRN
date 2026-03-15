import { Users } from "lucide-react";

export function LoyalModule() {
    return (
        <div className="flex min-h-[600px] items-center justify-center px-4 py-16">
            <div className="premium-card-dark w-full max-w-2xl overflow-hidden p-14 text-center">
                <div
                    className="absolute inset-y-0 right-0 w-[55%] overflow-hidden opacity-20 pointer-events-none"
                    style={{
                        WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 90%)",
                        maskImage: "linear-gradient(to left, black 10%, transparent 90%)"
                    }}
                >
                    <div className="story-grid-pattern" />
                </div>

                <div className="relative z-10">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                        <Users className="h-8 w-8 text-white/80" />
                    </div>
                    <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Coming Soon
                    </p>
                    <h2 className="font-display text-4xl font-light tracking-tight text-white">
                        S+Loyal
                    </h2>
                    <p className="mt-4 text-lg font-light leading-relaxed text-slate-400">
                        CRM & customer intelligence. Segment your customer base, track purchase patterns, and build retention programs that actually work.
                    </p>
                    <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        In development
                    </div>
                </div>
            </div>
        </div>
    );
}
