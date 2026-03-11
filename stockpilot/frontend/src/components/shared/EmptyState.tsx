import { Sparkles } from "lucide-react";
import { Card } from "./Card";

export function EmptyState() {
    return (
        <div className="premium-card-dark relative overflow-hidden p-10 sm:p-16 w-full">
            {/* Background Story Grid Mask for right 50% */}
            <div 
                className="absolute inset-y-0 right-0 w-[50%] overflow-hidden opacity-20 pointer-events-none"
                style={{ 
                    WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 90%)", 
                    maskImage: "linear-gradient(to left, black 10%, transparent 90%)" 
                }}
            >
                <div className="story-grid-pattern" />
            </div>

            <div className="relative z-10 flex flex-col gap-10">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white shadow-soft">
                    <Sparkles className="h-10 w-10" />
                </div>
                <div className="space-y-6">
                    <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Drop an inventory export to unlock the workspace
                    </h2>
                    <p className="max-w-4xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                        S+ Label expects columns such as SKU, Product Name, Category, Store,
                        Stock, Unit Price, Daily Sales, Lead Time, Safety Stock, or Reorder Point.
                        Missing values are inferred so you can start with imperfect spreadsheets.
                    </p>
                </div>
            </div>
        </div>
    );
}
