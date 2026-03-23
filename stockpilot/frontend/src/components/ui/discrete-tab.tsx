"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

type IconComponent = React.ComponentType<{ className?: string; size?: string | number }>;

export type DiscreteTabItem<T extends string> = {
    id: T;
    title: string;
    icon: IconComponent;
};

interface DiscreteTabsProps<T extends string> {
    tabs: DiscreteTabItem<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    className?: string;
}

export function DiscreteTabs<T extends string>({
    tabs,
    activeTab,
    onTabChange,
    className,
}: DiscreteTabsProps<T>) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            {tabs.map((tab) => (
                <DiscreteTabButton
                    key={tab.id}
                    tabId={tab.id}
                    title={tab.title}
                    ButtonIcon={tab.icon}
                    isActive={activeTab === tab.id}
                    onActivate={onTabChange}
                />
            ))}
        </div>
    );
}

function DiscreteTabButton<T extends string>({
    tabId,
    title,
    ButtonIcon,
    isActive,
    onActivate,
}: {
    tabId: T;
    title: string;
    ButtonIcon: IconComponent;
    isActive: boolean;
    onActivate: (id: T) => void;
}) {
    const [showShine, setShowShine] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        if (isActive && hasInteracted) {
            setShowShine(true);
            const timer = setTimeout(() => setShowShine(false), 600);
            return () => clearTimeout(timer);
        }
    }, [isActive, hasInteracted]);

    const handleClick = useCallback(() => {
        setHasInteracted(true);
        onActivate(tabId);
    }, [onActivate, tabId]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                "relative flex items-center justify-center overflow-hidden cursor-pointer",
                "rounded-[50px] bg-slate-800 border border-slate-700/50",
                "shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
                "transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]",
                isActive
                    ? "text-white h-[48px] gap-2.5 px-6"
                    : "text-white h-[48px] w-[48px]"
            )}
        >
            {showShine && (
                <motion.span
                    initial={{ x: "-120%", opacity: 0 }}
                    animate={{ x: "120%", opacity: [0, 0.4, 0] }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] blur-[2px]"
                />
            )}

            <ButtonIcon className="h-[21px] w-[21px] shrink-0" />

            <AnimatePresence initial={false}>
                {isActive && (
                    <motion.span
                        key={tabId}
                        initial={hasInteracted ? { opacity: 0, filter: "blur(3px)" } : false}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(3px)" }}
                        transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                        className="whitespace-nowrap text-[14px] font-medium leading-none uppercase"
                    >
                        {title}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}

export default DiscreteTabs;
