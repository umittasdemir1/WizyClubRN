export interface SubtitleSegment {
    startMs: number;
    endMs: number;
    text: string;
}

export interface SubtitlePresentation {
    leftRatio: number; // 0..1
    topRatio: number; // 0..1
    widthRatio: number; // 0..1
    heightRatio: number; // 0..1
}

export type SubtitleTextAlign =
    | 'start'
    | 'center'
    | 'end'
    | 'left'
    | 'right';

export interface SubtitleStyle {
    fontSize: number;
    textAlign: SubtitleTextAlign;
    showOverlay: boolean;
}

export interface SubtitleData {
    id: string;
    video_id: string;
    language: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    segments: SubtitleSegment[];
    presentation?: SubtitlePresentation | null;
    style?: SubtitleStyle | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}
