import { motion } from "framer-motion";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface Tab3DItem<T extends string> {
    id: T;
    label: string;
    icon: LucideIcon;
}

interface Props<T extends string> {
    tabs: Tab3DItem<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    className?: string;
}

export function Tabs3D<T extends string>({
    tabs,
    activeTab,
    onTabChange,
    className,
}: Props<T>) {
    const [hasClicked, setHasClicked] = useState(false);

    function handleClick(id: T) {
        setHasClicked(true);
        if (id !== activeTab) onTabChange(id);
    }

    return (
        <div className={cn("flex space-x-6 rounded-full", className)}>
            {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <motion.button
                        key={tab.id}
                        type="button"
                        whileTap="tapped"
                        whileHover="hovered"
                        onClick={() => handleClick(tab.id)}
                        className={cn(
                            "relative flex cursor-pointer flex-col items-center gap-1.5 px-3 py-2 tracking-[0.01em] transition focus-visible:outline-none focus-visible:ring-1",
                            isActive
                                ? "text-slate-900 font-medium"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                        {/* Animated underline */}
                        {isActive && (
                            <motion.span
                                layoutId="academia-tab-underline"
                                className="absolute bottom-0 left-0 z-10 h-[2.5px] w-full rounded-full bg-slate-900"
                                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
                            />
                        )}

                        {/* Animated icon */}
                        <motion.div
                            initial={hasClicked ? false : { scale: 0 }}
                            animate={{
                                scale: 1,
                                transition: {
                                    type: "spring",
                                    bounce: 0.2,
                                    damping: 7,
                                    duration: 0.4,
                                    delay: index * 0.08,
                                },
                            }}
                            variants={{
                                ...(!isActive && {
                                    hovered: { scale: 1.15, rotate: 5 },
                                    tapped: {
                                        scale: 0.8,
                                        transition: {
                                            type: "spring",
                                            bounce: 0.2,
                                            damping: 7,
                                            duration: 0.4,
                                        },
                                    },
                                }),
                            }}
                            transition={{ type: "spring" }}
                            className="relative"
                        >
                            <motion.div
                                animate={isActive ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
                                transition={isActive ? { duration: 0.4, ease: "easeInOut" } : { duration: 0.2 }}
                            >
                                <Icon
                                    className={cn(
                                        "h-6 w-6 transition-colors duration-200",
                                        isActive ? "text-slate-900" : "text-slate-400"
                                    )}
                                    strokeWidth={isActive ? 2.2 : 1.8}
                                />
                            </motion.div>
                        </motion.div>

                        {/* Label */}
                        <span className="text-[12px] leading-none">{tab.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}
