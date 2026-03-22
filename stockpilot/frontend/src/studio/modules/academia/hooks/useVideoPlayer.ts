import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AcademiaMediaKind } from "../../../../types/academia";
import { VIDEO_NOTE_CAPTURE_MAX_WIDTH, VIDEO_NOTE_CAPTURE_QUALITY } from "../constants";
import type { AcademiaComposerVisualDraft, AcademiaSourceMode } from "../types";
import { buildYouTubeEmbedUrl, getMediaDisplayName, resolveMediaKind } from "../utils";

interface UseVideoPlayerInput {
    mediaFile: File | null;
    sourceMode: AcademiaSourceMode;
    youtubeEmbedUrl: string | null;
}

export interface UseVideoPlayerResult {
    videoElementRef: React.RefObject<HTMLVideoElement>;
    playerSurfaceRef: React.RefObject<HTMLDivElement>;
    previewUrl: string | null;
    playerHeight: number;
    mediaKind: AcademiaMediaKind | null;
    mediaDisplayName: string;
    videoCurrentTime: number;
    videoDuration: number;
    isVideoPlaying: boolean;
    isVideoMuted: boolean;
    videoVolume: number;
    videoProgressPercent: number;
    toggleVideoPlayback: () => void;
    handleVideoLoadedMetadata: () => void;
    handleVideoTimeUpdate: () => void;
    handleVideoSeeked: () => void;
    handleVideoProgressChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleVideoMuteToggle: () => void;
    handleVideoVolumeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleVideoPlay: () => void;
    handleVideoPause: () => void;
    handleVideoEnded: () => void;
    seekVideoToTime: (nextTime: number) => void;
    captureVideoFrame: () => AcademiaComposerVisualDraft | null;
    setVideoCurrentTime: (time: number) => void;
}

export function useVideoPlayer({ mediaFile, sourceMode, youtubeEmbedUrl }: UseVideoPlayerInput): UseVideoPlayerResult {
    const videoElementRef = useRef<HTMLVideoElement>(null);
    const playerSurfaceRef = useRef<HTMLDivElement>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [playerHeight, setPlayerHeight] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [videoVolume, setVideoVolume] = useState(1);

    const mediaKind = useMemo(() => (mediaFile ? resolveMediaKind(mediaFile) : null), [mediaFile]);
    const mediaDisplayName = useMemo(
        () => (mediaFile ? getMediaDisplayName(mediaFile.name) : ""),
        [mediaFile]
    );
    const videoProgressPercent = videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0;

    // Create and revoke object URL for local file preview.
    useEffect(() => {
        if (!mediaFile) {
            setPreviewUrl(null);
            setVideoCurrentTime(0);
            setVideoDuration(0);
            setIsVideoPlaying(false);
            return undefined;
        }

        const nextPreviewUrl = URL.createObjectURL(mediaFile);
        setPreviewUrl(nextPreviewUrl);
        return () => URL.revokeObjectURL(nextPreviewUrl);
    }, [mediaFile]);

    // Track player surface height for sidebar sync.
    useEffect(() => {
        const node = playerSurfaceRef.current;
        if (!node || typeof ResizeObserver === "undefined") {
            return undefined;
        }

        const updateHeight = () => {
            setPlayerHeight(node.getBoundingClientRect().height);
        };

        updateHeight();

        const observer = new ResizeObserver(() => updateHeight());
        observer.observe(node);

        return () => observer.disconnect();
    }, [mediaFile, sourceMode, youtubeEmbedUrl]);

    // Reset playback state when source switches away from upload.
    useEffect(() => {
        if (sourceMode !== "upload") {
            setVideoCurrentTime(0);
            setVideoDuration(0);
            setIsVideoPlaying(false);
        }
    }, [mediaFile, sourceMode]);

    function toggleVideoPlayback() {
        const node = videoElementRef.current;
        if (!node) return;

        if (node.paused) {
            void node.play();
            return;
        }

        node.pause();
    }

    function handleVideoLoadedMetadata() {
        const node = videoElementRef.current;
        if (!node) return;

        setVideoCurrentTime(node.currentTime);
        setVideoDuration(node.duration);
        setIsVideoMuted(node.muted);
        setVideoVolume(node.volume);
    }

    function handleVideoTimeUpdate() {
        const node = videoElementRef.current;
        if (!node) return;
        setVideoCurrentTime(node.currentTime);
    }

    function handleVideoSeeked() {
        const node = videoElementRef.current;
        if (!node) return;
        setVideoCurrentTime(node.currentTime);
    }

    function handleVideoProgressChange(event: ChangeEvent<HTMLInputElement>) {
        const node = videoElementRef.current;
        if (!node) return;

        const nextTime = Number(event.target.value);
        node.currentTime = nextTime;
        setVideoCurrentTime(nextTime);
    }

    function handleVideoMuteToggle() {
        const node = videoElementRef.current;
        if (!node) return;

        const nextMuted = !node.muted;
        node.muted = nextMuted;
        setIsVideoMuted(nextMuted);
    }

    function handleVideoVolumeChange(event: ChangeEvent<HTMLInputElement>) {
        const node = videoElementRef.current;
        if (!node) return;

        const nextVolume = Number(event.target.value);
        node.volume = nextVolume;
        node.muted = nextVolume <= 0;
        setVideoVolume(nextVolume);
        setIsVideoMuted(node.muted);
    }

    function seekVideoToTime(nextTime: number) {
        const node = videoElementRef.current;
        if (!node || !Number.isFinite(nextTime)) return;

        node.currentTime = Math.max(0, nextTime);
        setVideoCurrentTime(node.currentTime);
    }

    // Returns a snapshot of the current video frame as a visual draft, or null on failure.
    function captureVideoFrame(): AcademiaComposerVisualDraft | null {
        const node = videoElementRef.current;
        if (!node || !mediaFile || sourceMode !== "upload" || mediaKind !== "video") {
            return null;
        }

        const sourceWidth = node.videoWidth;
        const sourceHeight = node.videoHeight;
        if (!sourceWidth || !sourceHeight) {
            return null;
        }

        const captureScale = Math.min(1, VIDEO_NOTE_CAPTURE_MAX_WIDTH / sourceWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(sourceWidth * captureScale));
        canvas.height = Math.max(1, Math.round(sourceHeight * captureScale));

        const context = canvas.getContext("2d");
        if (!context) {
            return null;
        }

        context.drawImage(node, 0, 0, canvas.width, canvas.height);

        try {
            const screenshotDataUrl = canvas.toDataURL("image/jpeg", VIDEO_NOTE_CAPTURE_QUALITY);
            return {
                capturedAtSeconds: node.currentTime,
                screenshotDataUrl,
                sourceName: mediaFile.name,
            };
        } catch {
            // Ignore capture failures; uploaded object URLs should remain capturable.
            return null;
        }
    }

    return {
        videoElementRef,
        playerSurfaceRef,
        previewUrl,
        playerHeight,
        mediaKind,
        mediaDisplayName,
        videoCurrentTime,
        videoDuration,
        isVideoPlaying,
        isVideoMuted,
        videoVolume,
        videoProgressPercent,
        toggleVideoPlayback,
        handleVideoLoadedMetadata,
        handleVideoTimeUpdate,
        handleVideoSeeked,
        handleVideoProgressChange,
        handleVideoMuteToggle,
        handleVideoVolumeChange,
        handleVideoPlay: () => setIsVideoPlaying(true),
        handleVideoPause: () => setIsVideoPlaying(false),
        handleVideoEnded: () => setIsVideoPlaying(false),
        seekVideoToTime,
        captureVideoFrame,
        setVideoCurrentTime,
    };
}
