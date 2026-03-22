import { type ChangeEvent } from "react";
import {
    Maximize,
    Minimize,
    Pause,
    Play,
    ScanText,
    Volume2,
    VolumeX,
} from "lucide-react";
import type { AcademiaTranscriptCue } from "../../../../types/academia";
import type { AcademiaMediaKind } from "../../../../types/academia";
import closedCaptionsDarkIcon from "../closed-captions-dark.svg";
import type { AcademiaSourceMode } from "../types";
import { formatPlaybackTime } from "../utils";

interface Props {
    sourceMode: AcademiaSourceMode;
    mediaKind: AcademiaMediaKind | null;
    previewUrl: string | null;
    youtubeEmbedUrl: string | null;
    mediaDisplayName: string;
    videoElementRef: React.RefObject<HTMLVideoElement>;
    playerSurfaceRef: React.RefObject<HTMLDivElement>;
    videoCurrentTime: number;
    videoDuration: number;
    isVideoPlaying: boolean;
    isVideoMuted: boolean;
    videoVolume: number;
    videoProgressPercent: number;
    isFullscreen: boolean;
    isVideoControllerVisible: boolean;
    activePlaybackCue: AcademiaTranscriptCue | null;
    activePlaybackWordIndex: number;
    canCaptureVideoNotes: boolean;
    onTogglePlayback: () => void;
    onVideoLoadedMetadata: () => void;
    onVideoTimeUpdate: () => void;
    onVideoSeeked: () => void;
    onVideoProgressChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onVideoMuteToggle: () => void;
    onVideoVolumeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onFullscreenToggle: () => void;
    onPlayerMouseEnter: () => void;
    onPlayerMouseMove: () => void;
    onPlayerTouchStart: () => void;
    onCaptureNote: () => void;
    onAudioTimeUpdate: (time: number) => void;
    onVideoPlay: () => void;
    onVideoPause: () => void;
    onVideoEnded: () => void;
}

export function AcademiaPlayer({
    sourceMode,
    mediaKind,
    previewUrl,
    youtubeEmbedUrl,
    mediaDisplayName,
    videoElementRef,
    playerSurfaceRef,
    videoCurrentTime,
    videoDuration,
    isVideoPlaying,
    isVideoMuted,
    videoVolume,
    videoProgressPercent,
    isFullscreen,
    isVideoControllerVisible,
    activePlaybackCue,
    activePlaybackWordIndex,
    canCaptureVideoNotes,
    onTogglePlayback,
    onVideoLoadedMetadata,
    onVideoTimeUpdate,
    onVideoSeeked,
    onVideoProgressChange,
    onVideoMuteToggle,
    onVideoVolumeChange,
    onFullscreenToggle,
    onPlayerMouseEnter,
    onPlayerMouseMove,
    onPlayerTouchStart,
    onCaptureNote,
    onAudioTimeUpdate,
    onVideoPlay,
    onVideoPause,
    onVideoEnded,
}: Props) {
    const overlayOpacityClass = isFullscreen
        ? isVideoControllerVisible ? "opacity-100" : "opacity-0"
        : "opacity-0 group-hover/player:opacity-100";

    const captionOffsetClass = isFullscreen
        ? isVideoControllerVisible ? "bottom-[88px]" : "bottom-[42px]"
        : "bottom-[42px] group-hover/player:bottom-[88px]";

    const actionVisibilityClass = isFullscreen
        ? isVideoControllerVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        : "pointer-events-none opacity-0 group-hover/player:pointer-events-auto group-hover/player:opacity-100";

    const controllerVisibilityClass = isFullscreen
        ? isVideoControllerVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        : "pointer-events-none opacity-0 group-hover/player:pointer-events-auto group-hover/player:opacity-100";

    return (
        <div
            ref={playerSurfaceRef}
            className="group/player aspect-video w-full overflow-hidden rounded-[12px] [clip-path:inset(0_round_12px)]"
            onMouseEnter={onPlayerMouseEnter}
            onMouseMove={onPlayerMouseMove}
            onTouchStart={onPlayerTouchStart}
        >
            {sourceMode === "upload" && previewUrl && mediaKind === "video" ? (
                <>
                    {/* Title overlay */}
                    {mediaDisplayName ? (
                        <div
                            className={`pointer-events-none absolute left-4 top-[11px] z-10 max-w-[62%] text-lg font-medium text-white transition-opacity duration-150 drop-shadow-[0_8px_24px_rgba(15,23,42,0.45)] ${overlayOpacityClass}`}
                        >
                            <span className="block truncate">{mediaDisplayName}</span>
                        </div>
                    ) : null}

                    {/* Capture note button */}
                    {canCaptureVideoNotes ? (
                        <div
                            className={`absolute right-4 top-[11px] z-20 transition-opacity duration-150 ${actionVisibilityClass}`}
                        >
                            <button
                                type="button"
                                onClick={onCaptureNote}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(15,23,42,0.82)] text-white transition hover:bg-[rgba(15,23,42,0.92)]"
                                aria-label="Capture note snapshot"
                            >
                                <ScanText className="h-[24px] w-[24px]" strokeWidth={2.2} />
                            </button>
                        </div>
                    ) : null}

                    {/* Video element */}
                    <video
                        ref={videoElementRef}
                        className="h-full w-full rounded-[12px] object-cover [clip-path:inset(0_round_12px)]"
                        src={previewUrl}
                        playsInline
                        onClick={onTogglePlayback}
                        onTimeUpdate={onVideoTimeUpdate}
                        onSeeked={onVideoSeeked}
                        onLoadedMetadata={onVideoLoadedMetadata}
                        onDurationChange={onVideoLoadedMetadata}
                        onPlay={onVideoPlay}
                        onPause={onVideoPause}
                        onEnded={onVideoEnded}
                        onVolumeChange={onVideoLoadedMetadata}
                    />

                    {/* Gradient overlay */}
                    <div
                        className={`pointer-events-none absolute inset-x-0 bottom-0 h-28 transition-opacity duration-150 bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.12)_26%,rgba(2,6,23,0.82)_100%)] ${overlayOpacityClass}`}
                    />

                    {/* Center play button when paused */}
                    {!isVideoPlaying ? (
                        <button
                            type="button"
                            onClick={onTogglePlayback}
                            className="absolute inset-0 z-10 flex items-center justify-center"
                            aria-label="Play video"
                        >
                            <Play
                                className="ml-1 h-[52px] w-[52px] fill-current text-white drop-shadow-[0_10px_26px_rgba(0,0,0,0.55)] transition hover:scale-[1.03]"
                                fill="currentColor"
                                stroke="currentColor"
                            />
                        </button>
                    ) : null}

                    {/* Captions overlay */}
                    {activePlaybackCue ? (
                        <div
                            className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6 transition-all duration-150 ${captionOffsetClass}`}
                        >
                            <div className="max-w-[78%] rounded-2xl bg-[rgba(0,0,0,0.72)] px-4 py-2.5 text-center text-[20px] font-medium leading-8 text-white md:text-[22px]">
                                <span className="whitespace-pre-wrap">
                                    {activePlaybackCue.words.length > 0
                                        ? activePlaybackCue.words.map((word, index) => (
                                              <span
                                                  key={`${activePlaybackCue.startSeconds}-${index}`}
                                                  className={
                                                      index === activePlaybackWordIndex
                                                          ? "text-amber-300"
                                                          : "text-white"
                                                  }
                                              >
                                                  {word.text}
                                              </span>
                                          ))
                                        : activePlaybackCue.text}
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {/* Video controls bar */}
                    <div
                        className={`absolute inset-x-0 bottom-0 z-10 px-3 pb-0.5 transition-opacity duration-150 ${controllerVisibilityClass}`}
                    >
                        <div className="px-1 pb-0.5 pt-1 text-white">
                            {/* Seek bar */}
                            <input
                                type="range"
                                min="0"
                                max={videoDuration || 0}
                                step="0.1"
                                value={Math.min(videoCurrentTime, videoDuration || 0)}
                                onChange={onVideoProgressChange}
                                className="h-[4px] w-full appearance-none rounded-full bg-white/18 accent-white"
                                aria-label="Seek video"
                                style={{
                                    background: `linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.96) ${videoProgressPercent}%, rgba(255,255,255,0.24) ${videoProgressPercent}%, rgba(255,255,255,0.24) 100%)`,
                                }}
                            />
                            <div className="mt-0.5 flex items-center justify-between gap-3">
                                {/* Left controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onTogglePlayback}
                                        className="inline-flex h-10 w-10 items-center justify-center leading-none text-white transition hover:text-white/80"
                                        aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                                    >
                                        {isVideoPlaying ? (
                                            <Pause
                                                className="block h-6 w-6 text-white fill-current"
                                                fill="currentColor"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                            />
                                        ) : (
                                            <Play
                                                className="block h-6 w-6 text-white fill-current"
                                                fill="currentColor"
                                                stroke="currentColor"
                                            />
                                        )}
                                    </button>
                                    <div className="text-[13px] font-normal tabular-nums text-white/88">
                                        {formatPlaybackTime(videoCurrentTime)} |{" "}
                                        {formatPlaybackTime(videoDuration)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onVideoMuteToggle}
                                        className="inline-flex h-10 w-10 items-center justify-center leading-none text-white transition hover:text-white/80"
                                        aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
                                    >
                                        {isVideoMuted || videoVolume <= 0 ? (
                                            <VolumeX className="block h-6 w-6 text-white" strokeWidth={2.2} />
                                        ) : (
                                            <Volume2 className="block h-6 w-6 text-white" strokeWidth={2.2} />
                                        )}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isVideoMuted ? 0 : videoVolume}
                                        onChange={onVideoVolumeChange}
                                        className="h-[3px] w-16 appearance-none rounded-full bg-white/20 accent-white"
                                        aria-label="Video volume"
                                    />
                                </div>
                                {/* Right controls */}
                                <div className="flex items-center gap-1 text-white">
                                    <button
                                        type="button"
                                        className="inline-flex h-10 w-10 items-center justify-center leading-none transition hover:text-white/80"
                                        aria-label="Captions"
                                    >
                                        <img
                                            src={closedCaptionsDarkIcon}
                                            alt=""
                                            className="block h-7 w-7"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void onFullscreenToggle();
                                        }}
                                        className="inline-flex h-10 w-10 items-center justify-center leading-none transition hover:text-white/80"
                                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                                    >
                                        {isFullscreen ? (
                                            <Minimize className="block h-6 w-6" />
                                        ) : (
                                            <Maximize className="block h-6 w-6" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : sourceMode === "upload" && previewUrl && mediaKind === "audio" ? (
                <div className="flex h-full w-full rounded-[12px] flex-col justify-end bg-[radial-gradient(circle_at_top,#1e3a8a,transparent_45%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-8 text-white [clip-path:inset(0_round_12px)]">
                    <div className="max-w-md text-sm leading-7 text-slate-300">
                        Audio source selected.
                    </div>
                    <audio
                        controls
                        className="mt-8 w-full rounded-[12px] [clip-path:inset(0_round_12px)]"
                        src={previewUrl}
                        onTimeUpdate={(event) => onAudioTimeUpdate(event.currentTarget.currentTime)}
                        onSeeked={(event) => onAudioTimeUpdate(event.currentTarget.currentTime)}
                        onLoadedMetadata={(event) => onAudioTimeUpdate(event.currentTarget.currentTime)}
                    />
                </div>
            ) : youtubeEmbedUrl ? (
                <iframe
                    className="h-full w-full rounded-[12px] bg-white [clip-path:inset(0_round_12px)]"
                    src={youtubeEmbedUrl}
                    title="Academia lesson preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-50 px-6 text-sm text-slate-400">
                    YouTube player could not be loaded.
                </div>
            )}
        </div>
    );
}
