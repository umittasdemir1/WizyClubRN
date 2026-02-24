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

export type SubtitleFontFamily =
    | 'system'
    | 'serif'
    | 'mono'
    | 'roboto'
    | 'openSans'
    | 'poppins'
    | 'montserrat'
    | 'lato'
    | 'sourceSansPro'
    | 'inter'
    | 'raleway'
    | 'oswald'
    | 'rubik'
    | 'ubuntu'
    | 'bebasNeue'
    | 'playfairDisplay'
    | 'pacifico'
    | 'dancingScript'
    | 'lobster';

export type SubtitleOverlayVariant =
    | 'dark'
    | 'light';

export type SubtitleFontWeight =
    | '400'
    | '500'
    | '600'
    | '700';

export type SubtitleTextCase =
    | 'original'
    | 'upper'
    | 'lower'
    | 'title'
    | 'sentence';

export interface SubtitleStyle {
    fontSize: number;
    textAlign: SubtitleTextAlign;
    showOverlay: boolean;
    fontFamily?: SubtitleFontFamily;
    textColor?: string;
    overlayVariant?: SubtitleOverlayVariant;
    fontWeight?: SubtitleFontWeight;
    textCase?: SubtitleTextCase;
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
