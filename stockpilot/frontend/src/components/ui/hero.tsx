"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion } from "framer-motion";

interface HeroNavItem {
    label: string;
    onClick?: () => void;
}

interface ShaderShowcaseProps {
    badge?: string;
    titleTop?: string;
    titleMain?: string;
    titleBottom?: string;
    description?: string;
    navItems?: HeroNavItem[];
    headerActionLabel?: string;
    primaryActionLabel?: string;
    secondaryActionLabel?: string;
    orbText?: string;
    onHeaderAction?: () => void;
    onPrimaryAction?: () => void;
    onSecondaryAction?: () => void;
}

export default function ShaderShowcase({
    badge = "New Paper Shaders Experience",
    titleTop = "Beautiful",
    titleMain = "Shader",
    titleBottom = "Experiences",
    description = "Create stunning visual experiences with our advanced shader technology. Interactive lighting, smooth animations, and beautiful effects that respond to your every move.",
    navItems = [
        { label: "Features" },
        { label: "Pricing" },
        { label: "Docs" },
    ],
    headerActionLabel = "Login",
    primaryActionLabel = "Get Started",
    secondaryActionLabel = "View Pricing",
    orbText = "Loxt - Mozzi / 21st.dev is amazing / 21st.dev is amazing / Loxt-MoZzI /",
    onHeaderAction,
    onPrimaryAction,
    onSecondaryAction,
}: ShaderShowcaseProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const handleMouseEnter = () => setIsActive(true);
        const handleMouseLeave = () => setIsActive(false);

        const container = containerRef.current;
        if (container) {
            container.addEventListener("mouseenter", handleMouseEnter);
            container.addEventListener("mouseleave", handleMouseLeave);
        }

        return () => {
            if (container) {
                container.removeEventListener("mouseenter", handleMouseEnter);
                container.removeEventListener("mouseleave", handleMouseLeave);
            }
        };
    }, []);

    return (
        <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-black">
            <svg className="absolute inset-0 h-0 w-0">
                <defs>
                    <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
                        <feColorMatrix
                            type="matrix"
                            values="1 0 0 0 0.02
                                    0 1 0 0 0.02
                                    0 0 1 0 0.05
                                    0 0 0 0.9 0"
                            result="tint"
                        />
                    </filter>
                    <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                            result="gooey"
                        />
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                    </filter>
                    <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                    <linearGradient id="hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="30%" stopColor="#06b6d4" />
                        <stop offset="70%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                    <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            </svg>

            <MeshGradient
                className="absolute inset-0 h-full w-full"
                colors={["#000000", "#06b6d4", "#0891b2", "#164e63", "#f97316"]}
                distortion={0.35}
                swirl={0.45}
                speed={0.3}
            />
            <MeshGradient
                className="absolute inset-0 h-full w-full opacity-60"
                colors={["#000000", "#ffffff", "#06b6d4", "#f97316"]}
                distortion={0.18}
                swirl={0.2}
                grainOverlay={0.08}
                speed={0.2}
            />

            <header className="relative z-20 flex items-center justify-between gap-4 p-4 sm:p-6">
                <motion.div
                    className="group relative flex items-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <motion.svg
                        fill="currentColor"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        className="size-10 text-white transition-all duration-300 group-hover:drop-shadow-lg"
                        style={{
                            filter: "url(#logo-glow)",
                        }}
                        whileHover={{
                            fill: "url(#logo-gradient)",
                            rotate: [0, -2, 2, 0],
                            transition: {
                                fill: { duration: 0.3 },
                                rotate: { duration: 0.6, ease: "easeInOut" },
                            },
                        }}
                    >
                        <motion.path
                            d="M15 85V15h12l18 35 18-35h12v70h-12V35L45 70h-10L17 35v50H15z"
                            initial={{ pathLength: 1 }}
                            whileHover={{
                                pathLength: [1, 0, 1],
                                transition: { duration: 1.2, ease: "easeInOut" },
                            }}
                        />
                    </motion.svg>

                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <motion.div
                                key={index}
                                className="absolute h-1 w-1 rounded-full bg-white/60"
                                style={{
                                    left: `${20 + Math.random() * 60}%`,
                                    top: `${20 + Math.random() * 60}%`,
                                }}
                                animate={{
                                    y: [-10, -20, -10],
                                    x: [0, Math.random() * 20 - 10, 0],
                                    opacity: [0, 1, 0],
                                    scale: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Number.POSITIVE_INFINITY,
                                    delay: index * 0.2,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                <nav className="hidden items-center space-x-2 sm:flex">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.onClick}
                            className="rounded-full px-3 py-2 text-xs font-light text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div id="gooey-btn" className="group relative flex items-center" style={{ filter: "url(#gooey-filter)" }}>
                    <button
                        type="button"
                        onClick={onHeaderAction ?? onPrimaryAction}
                        className="absolute right-0 z-0 flex h-8 -translate-x-10 items-center justify-center rounded-full bg-white px-2.5 py-2 text-black transition-all duration-300 hover:bg-white/90 group-hover:-translate-x-[4.75rem]"
                    >
                        <ArrowUpRight className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={onHeaderAction ?? onPrimaryAction}
                        className="z-10 flex h-8 items-center rounded-full bg-white px-6 py-2 text-xs font-normal text-black transition-all duration-300 hover:bg-white/90"
                    >
                        {headerActionLabel}
                    </button>
                </div>
            </header>

            <main className="absolute inset-x-0 bottom-6 z-20 px-6 sm:bottom-8 sm:left-8 sm:right-auto sm:max-w-2xl sm:px-0">
                <div className="text-left">
                    <motion.div
                        className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
                        style={{
                            filter: "url(#glass-effect)",
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="absolute left-1 right-1 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                        <Sparkles className="relative z-10 h-4 w-4 text-white/90" />
                        <span className="relative z-10 text-sm font-medium tracking-wide text-white/90">{badge}</span>
                    </motion.div>

                    <motion.h1
                        className="mb-6 text-6xl font-bold leading-none tracking-tight text-white md:text-7xl lg:text-8xl"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <motion.span
                            className="mb-2 block text-4xl font-light tracking-wider text-white/90 md:text-5xl lg:text-6xl"
                            style={{
                                background: "linear-gradient(135deg, #ffffff 0%, #06b6d4 30%, #f97316 70%, #ffffff 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                filter: "url(#text-glow)",
                            }}
                            animate={{
                                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                            }}
                        >
                            {titleTop}
                        </motion.span>
                        <span className="block drop-shadow-2xl">{titleMain}</span>
                        <span className="block italic text-white/80">{titleBottom}</span>
                    </motion.h1>

                    <motion.p
                        className="mb-8 max-w-xl text-lg font-light leading-relaxed text-white/70"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        {description}
                    </motion.p>

                    <motion.div
                        className="flex flex-wrap items-center gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.0 }}
                    >
                        <motion.button
                            type="button"
                            onClick={onSecondaryAction}
                            className="cursor-pointer rounded-full border-2 border-white/30 bg-transparent px-10 py-4 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/50 hover:bg-white/10 hover:text-cyan-100"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {secondaryActionLabel}
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={onPrimaryAction}
                            className="cursor-pointer rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-10 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-cyan-400 hover:to-orange-400 hover:shadow-xl"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {primaryActionLabel}
                        </motion.button>
                    </motion.div>
                </div>
            </main>

            <motion.div
                className="absolute bottom-8 right-8 z-30 hidden md:block"
                animate={{
                    scale: isActive ? 1.04 : 1,
                    opacity: isActive ? 1 : 0.9,
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
            >
                <div className="relative flex h-20 w-20 items-center justify-center">
                    <PulsingBorder
                        colors={["#06b6d4", "#0891b2", "#f97316", "#00FF88", "#FFD700"]}
                        colorBack="#00000000"
                        speed={1.5}
                        roundness={1}
                        thickness={0.1}
                        softness={0.2}
                        intensity={0.8}
                        bloom={0.85}
                        spots={5}
                        spotSize={0.1}
                        pulse={0.1}
                        smoke={0.5}
                        smokeSize={0.45}
                        scale={0.65}
                        rotation={0}
                        frame={9161408.251009725}
                        style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                        }}
                    />

                    <motion.svg
                        className="absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 20,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                        style={{ transform: "scale(1.6)" }}
                    >
                        <defs>
                            <path id="circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
                        </defs>
                        <text className="fill-white/80 text-sm font-medium">
                            <textPath href="#circle" startOffset="0%">
                                {orbText}
                            </textPath>
                        </text>
                    </motion.svg>
                </div>
            </motion.div>
        </div>
    );
}
