import { useEffect, useRef, useState } from "react";
import { FULLSCREEN_CONTROLLER_IDLE_MS } from "../constants";

export interface UseFullscreenResult {
    isFullscreen: boolean;
    isFullscreenControllerVisible: boolean;
    isVideoControllerVisible: boolean;
    handleFullscreenToggle: () => Promise<void>;
    revealFullscreenController: () => void;
    handlePlayerTouchStart: () => void;
}

export function useFullscreen(
    playerSurfaceRef: React.RefObject<HTMLDivElement>
): UseFullscreenResult {
    const timerRef = useRef<number | null>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFullscreenControllerVisible, setIsFullscreenControllerVisible] = useState(false);

    const isVideoControllerVisible = !isFullscreen || isFullscreenControllerVisible;

    function clearTimer() {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }

    function scheduleHide() {
        clearTimer();
        if (!isFullscreen) return;

        timerRef.current = window.setTimeout(() => {
            setIsFullscreenControllerVisible(false);
            timerRef.current = null;
        }, FULLSCREEN_CONTROLLER_IDLE_MS);
    }

    function revealFullscreenController() {
        if (!isFullscreen) return;
        setIsFullscreenControllerVisible(true);
        scheduleHide();
    }

    // Listen for browser fullscreen changes.
    useEffect(() => {
        if (typeof document === "undefined") {
            return undefined;
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === playerSurfaceRef.current);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [playerSurfaceRef]);

    // Show controller when entering fullscreen, hide when exiting.
    useEffect(() => {
        if (!isFullscreen) {
            clearTimer();
            setIsFullscreenControllerVisible(false);
            return undefined;
        }

        setIsFullscreenControllerVisible(true);
        scheduleHide();

        return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullscreen]);

    // Cleanup timer on unmount.
    useEffect(() => {
        return () => clearTimer();
    }, []);

    async function handleFullscreenToggle() {
        const node = playerSurfaceRef.current;
        if (!node || typeof document === "undefined") return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await node.requestFullscreen();
    }

    function handlePlayerTouchStart() {
        revealFullscreenController();
    }

    return {
        isFullscreen,
        isFullscreenControllerVisible,
        isVideoControllerVisible,
        handleFullscreenToggle,
        revealFullscreenController,
        handlePlayerTouchStart,
    };
}
