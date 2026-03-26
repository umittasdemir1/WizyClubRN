import { memo, useState } from "react";
import { Upload } from "lucide-react";
import { AcademiaVideoSplash } from "./AcademiaVideoSplash";
const BLOOM_VIDEO_URL =
    "https://wizy-r2-proxy.tasdemir-umit.workers.dev/media/080e2237-36ec-4b86-b455-3f769e8fa4e8/videos/f7a2c819-3d56-4e1b-b8f0-91c47e6d2a35/10755267-hd_3840_2160_30fps.mp4";

interface Props {
    onUploadClick: () => void;
    onVideoReady?: () => void;
}

export const AcademiaBloomEmptyState = memo(function AcademiaBloomEmptyState({ onUploadClick, onVideoReady }: Props) {
    const [videoReady, setVideoReady] = useState(false);

    return (
        <div className="academia-bloom-shell relative h-full w-full overflow-hidden text-white">
            {/* Background video */}
            <video
                className="absolute inset-0 z-0 h-full w-full object-cover"
                src={BLOOM_VIDEO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                onCanPlay={() => { setVideoReady(true); onVideoReady?.(); }}
            />
            <AcademiaVideoSplash visible={!videoReady} />
            <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0.38)_100%)]" />
            <div className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08)_0%,transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06)_0%,transparent_34%)]" />

            {/*
              Layout:
              - Mobile (<lg): single column, content pushed toward the BOTTOM of the screen
              - Desktop (lg+): two-column row — text on left ~39%, spacer on right
            */}
            <div className="relative z-10 flex h-full min-h-0 flex-col lg:flex-row">
                {/* Content column */}
                <section className="relative flex min-h-0 w-full flex-1 p-4 lg:w-[39%] lg:flex-none lg:p-6 xl:w-[35%]">
                    <div className="relative z-10 flex h-full w-full flex-col px-6 py-5 lg:px-10 lg:py-8">
                        {/*
                          Mobile: justify-start pushes content toward TOP of screen.
                          Desktop: justify-center keeps it vertically centered in column.
                        */}
                        {/*
                          Mobile: justify-start pushes content toward TOP of screen.
                          Desktop: justify-center keeps it vertically centered in column.
                        */}
                        <div className="flex flex-1 flex-col items-start justify-end lg:items-start lg:justify-center text-left">
                            <div className="flex max-w-xl flex-col items-start gap-8 lg:gap-12 pb-8 lg:pb-0">
                                <h1 className="font-bloom-display max-w-4xl font-medium leading-[0.92] tracking-[-0.05em] text-white"
                                    style={{ fontSize: "clamp(1.5rem, 7vw, 4rem)" }}>
                                    <span className="block">Don't just watch,</span>
                                    <span className="font-bloom-serif block italic text-white/80">build in layers.</span>
                                </h1>

                                <button
                                    type="button"
                                    onClick={onUploadClick}
                                    className="studio-animated-border liquid-glass-strong bloom-upload-cta inline-flex items-center gap-3 rounded-full px-5 py-3 font-bloom-display text-sm font-medium text-white"
                                >
                                    <span>Upload Now</span>
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                                        <Upload className="h-4 w-4" />
                                    </span>
                                </button>

                                <div className="flex w-full flex-col items-start gap-4 text-left">
                                    <span className="font-bloom-display text-[11px] uppercase tracking-[0.38em] text-white/50 lg:text-[13px]">
                                        INTELLIGENT STUDY FLOW
                                    </span>
                                    <p className="font-bloom-display font-medium tracking-[-0.03em] text-white/90"
                                        style={{ fontSize: "clamp(0.8rem, 1.3vw, 1.25rem)", lineHeight: 1.5 }}>
                                        Move through the <span className="font-bloom-serif italic text-white/80">transcript</span>,
                                        turn key frames into <span className="font-bloom-serif italic text-white/80">visual notes</span>,
                                        add your ideas, and shape your own <span className="font-bloom-serif italic text-white/80">summary flow</span>.
                                    </p>
                                    <div className="flex items-center gap-3 text-white/60">
                                        <span className="h-px w-10 bg-white/20" />
                                        <span className="font-bloom-display text-[11px] uppercase tracking-[0.34em] lg:text-[13px]">
                                            S+ACADEMIA
                                        </span>
                                        <span className="h-px w-10 bg-white/20" />
                                    </div>
                                </div>

</div>
                        </div>
                    </div>
                </section>

                {/* Right spacer — desktop only */}
                <div className="hidden lg:block lg:flex-1" aria-hidden="true" />
            </div>
        </div>
    );
});
