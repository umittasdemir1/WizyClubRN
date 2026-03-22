import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { AcademiaExpandedNote } from "./components/AcademiaExpandedNote";
import { AcademiaNoteComposer } from "./components/AcademiaNoteComposer";
import { AcademiaNotesPanel } from "./components/AcademiaNotesPanel";
import { AcademiaPlayer } from "./components/AcademiaPlayer";
import { AcademiaSummaryPanel } from "./components/AcademiaSummaryPanel";
import { AcademiaTabBar } from "./components/AcademiaTabBar";
import { AcademiaTranscriptPanel } from "./components/AcademiaTranscriptPanel";
import { MEDIA_ACCEPT } from "./constants";
import { useAcademiaNotes } from "./hooks/useAcademiaNotes";
import { useAcademiaSummary } from "./hooks/useAcademiaSummary";
import { useAcademiaTranscription } from "./hooks/useAcademiaTranscription";
import { useFullscreen } from "./hooks/useFullscreen";
import { useTranscriptScroll } from "./hooks/useTranscriptScroll";
import { useVideoPlayer } from "./hooks/useVideoPlayer";
import type { AcademiaSidebarTab, AcademiaSourceMode } from "./types";
import { buildYouTubeEmbedUrl } from "./utils";

// Header fixed at 53px; main has pt-[53px]. Module adds pt-4 (16px) + pb-[10px].
const CARD_HEIGHT = "calc(100vh - 79px)";

export function AcademiaModule() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [sourceMode] = useState<AcademiaSourceMode>("upload");
    const [youtubeUrl] = useState("");
    const [activeSidebarTab, setActiveSidebarTab] = useState<AcademiaSidebarTab>("transcript");

    const youtubeEmbedUrl = useMemo(() => buildYouTubeEmbedUrl(youtubeUrl), [youtubeUrl]);

    const player = useVideoPlayer({ mediaFile, sourceMode, youtubeEmbedUrl });
    const fullscreen = useFullscreen(player.playerSurfaceRef);
    const transcription = useAcademiaTranscription(mediaFile);
    const notes = useAcademiaNotes({
        mediaFile,
        videoCurrentTime: player.videoCurrentTime,
        activeSidebarTab,
    });
    const summary = useAcademiaSummary({ sourceMode, mediaFile, youtubeEmbedUrl });
    const scroll = useTranscriptScroll({
        transcript: transcription.transcript,
        videoCurrentTime: player.videoCurrentTime,
        sourceMode,
    });

    const canCaptureVideoNotes =
        sourceMode === "upload" && Boolean(player.previewUrl) && player.mediaKind === "video";

    function handleUploadClick() {
        fileInputRef.current?.click();
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const nextFile = event.target.files?.[0] ?? null;
        if (!nextFile) return;
        setMediaFile(nextFile);
        event.target.value = "";
    }

    function handleCaptureNote() {
        const draft = player.captureVideoFrame();
        if (!draft) return;
        notes.setComposerVisualDraft(draft);
        setActiveSidebarTab("notes");
    }

    return (
        <div className="px-[10px] pb-[10px] pt-4">
            <input
                ref={fileInputRef}
                type="file"
                accept={MEDIA_ACCEPT}
                className="hidden"
                onChange={handleFileChange}
            />

            <div
                className="flex overflow-hidden rounded-[16px] bg-white shadow-[0_0_0_1px_rgba(226,232,240,0.8),0_12px_32px_rgba(15,23,42,0.09),0_2px_12px_rgba(15,23,42,0.06)]"
                style={{ height: CARD_HEIGHT }}
            >
                {/* ── Left: video column — no header, player fills the space ── */}
                <div className="flex min-w-0 flex-1 flex-col p-5">
                    <section className="relative min-h-0 flex-1 flex items-center overflow-hidden rounded-[12px]">
                        <div className="w-full">
                            <AcademiaPlayer
                                sourceMode={sourceMode}
                                mediaKind={player.mediaKind}
                                previewUrl={player.previewUrl}
                                youtubeEmbedUrl={youtubeEmbedUrl}
                                mediaDisplayName={player.mediaDisplayName}
                                videoElementRef={player.videoElementRef}
                                playerSurfaceRef={player.playerSurfaceRef}
                                videoCurrentTime={player.videoCurrentTime}
                                videoDuration={player.videoDuration}
                                isVideoPlaying={player.isVideoPlaying}
                                isVideoMuted={player.isVideoMuted}
                                videoVolume={player.videoVolume}
                                videoProgressPercent={player.videoProgressPercent}
                                isFullscreen={fullscreen.isFullscreen}
                                isVideoControllerVisible={fullscreen.isVideoControllerVisible}
                                activePlaybackCue={scroll.activePlaybackCue}
                                activePlaybackWordIndex={scroll.activePlaybackWordIndex}
                                canCaptureVideoNotes={canCaptureVideoNotes}
                                onTogglePlayback={player.toggleVideoPlayback}
                                onVideoLoadedMetadata={player.handleVideoLoadedMetadata}
                                onVideoTimeUpdate={player.handleVideoTimeUpdate}
                                onVideoSeeked={player.handleVideoSeeked}
                                onVideoProgressChange={player.handleVideoProgressChange}
                                onVideoMuteToggle={player.handleVideoMuteToggle}
                                onVideoVolumeChange={player.handleVideoVolumeChange}
                                onFullscreenToggle={fullscreen.handleFullscreenToggle}
                                onPlayerMouseEnter={fullscreen.revealFullscreenController}
                                onPlayerMouseMove={fullscreen.revealFullscreenController}
                                onPlayerTouchStart={fullscreen.handlePlayerTouchStart}
                                onCaptureNote={handleCaptureNote}
                                onAudioTimeUpdate={player.setVideoCurrentTime}
                                onVideoPlay={player.handleVideoPlay}
                                onVideoPause={player.handleVideoPause}
                                onVideoEnded={player.handleVideoEnded}
                            />
                        </div>
                    </section>

                    {transcription.isTranscriptionRunning ? (
                        <div className="mt-3 shrink-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[12px] text-slate-400">
                                    {transcription.transcriptionStatus?.message ?? "Processing…"}
                                </span>
                                <span className="tabular-nums text-[12px] font-medium text-slate-500">
                                    {transcription.transcriptProgress}%
                                </span>
                            </div>
                            <div className="h-[3px] overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                    style={{ width: `${transcription.transcriptProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : null}

                    {transcription.requestState === "error" ? (
                        <p className="mt-2 shrink-0 text-[12px] text-rose-500">
                            {transcription.errorMessage}
                        </p>
                    ) : null}
                </div>

                {/* ── Right: transcript sidebar ── */}
                <div className="relative flex w-[420px] shrink-0 flex-col border-l border-slate-100">
                    <AcademiaTabBar
                        activeSidebarTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
                        onUploadClick={handleUploadClick}
                    />

                    <div className="relative min-h-0 flex-1 overflow-hidden pb-5">
                        {activeSidebarTab === "transcript" ? (
                            <AcademiaTranscriptPanel
                                transcript={transcription.transcript}
                                transcriptViewportRef={scroll.transcriptViewportRef}
                                cueItemRefs={scroll.cueItemRefs}
                                isTranscriptScrollbarActive={scroll.isTranscriptScrollbarActive}
                                activePlaybackCueIndex={scroll.activePlaybackCueIndex}
                                activePlaybackWordIndex={scroll.activePlaybackWordIndex}
                                onScrollbarActivate={scroll.activateTranscriptScrollbar}
                                onScrollbarDeactivate={scroll.deactivateTranscriptScrollbar}
                            />
                        ) : activeSidebarTab === "notes" ? (
                            <AcademiaNotesPanel
                                visualNotes={notes.visualNotes}
                                writtenNotes={notes.writtenNotes}
                                notesViewportRef={notes.notesViewportRef}
                                visualNotesRailRef={notes.visualNotesRailRef}
                                isTranscriptScrollbarActive={scroll.isTranscriptScrollbarActive}
                                onScrollbarActivate={scroll.activateTranscriptScrollbar}
                                onScrollbarDeactivate={scroll.deactivateTranscriptScrollbar}
                                onScrollVisualNotes={notes.scrollVisualNotes}
                                onSeekToTime={player.seekVideoToTime}
                                onOpenNote={notes.openExpandedNote}
                            />
                        ) : activeSidebarTab === "summary" ? (
                            <AcademiaSummaryPanel
                                summaryDraft={summary.summaryDraft}
                                canSubmitSummary={summary.canSubmitSummary}
                                onDraftChange={(v) => summary.setSummaryDraft(v)}
                                onSubmit={summary.submitSummary}
                            />
                        ) : null}
                    </div>

                    {activeSidebarTab === "notes" ? (
                        <AcademiaNoteComposer
                            sidebarMessageDraft={notes.sidebarMessageDraft}
                            composerVisualDraft={notes.composerVisualDraft}
                            canSubmitSidebarNote={notes.canSubmitSidebarNote}
                            onDraftChange={(v) => notes.setSidebarMessageDraft(v)}
                            onClearVisualDraft={notes.clearComposerVisualDraft}
                            onSubmit={notes.submitSidebarNote}
                        />
                    ) : null}

                    {notes.expandedNote ? (
                        <AcademiaExpandedNote
                            note={notes.expandedNote}
                            onClose={notes.closeExpandedNote}
                            onSeekToTime={player.seekVideoToTime}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
