export type ShadowToken = {
    color: string;
    opacity: number;
    radius: number;
    elevation: number;
    offsetX: number;
    offsetY: number;
};

export const SURFACE_THEME_TOKENS = {
    light: {
        // Tam ekran modal/sheet ana zemin rengi (Açık tema)
        fullScreenBackground: '#FFFFFF',
        // Bottom sheet ana arka plan rengi (Açık tema)
        sheetBackground: '#FFFFFF',
        // Bottom sheet tutamaç (handle) rengi
        sheetHandle: '#000000',
        // Bottom sheet sınır/ayraç ana rengi
        sheetBorder: '#E5E5E5',
        // Sheet içinde kart benzeri ikincil yüzey rengi
        sheetCard: '#F0F0F0',
        // Sheet içinde ikincil/meta metin rengi
        sheetMutedText: '#555555',
        // Segmented control grup arka planı
        segmentedFill: '#EDEDF0',
        // Input alanı arka planı
        inputBackground: '#F5F5F5',
        // Preview yüzeyi (thumbnail vb.)
        previewSurface: '#F5F5F5',
        // Modal karartma katmanı (standart)
        modalOverlay: 'rgba(0,0,0,0.5)',
        // Modal karartma katmanı (yumuşak)
        modalOverlaySoft: 'rgba(0,0,0,0.45)',
        // Modal kutu arka plan rengi
        modalBackground: '#FFFFFF',
        // Modal ayraç (separator) rengi
        modalSeparator: '#E5E5EA',
        // Vurgu rengi (accent)
        accent: '#3A8DFF',
        // Birincil aksiyon metni/ikon rengi
        actionPrimary: '#0A84FF',
        // Destructive aksiyon rengi
        actionDanger: '#FF453A',
        // ---- Boyut / Radius / Kalınlık ----
        // Bottom sheet üst köşe radius'u
        sheetTopRadius: 30,
        // Bottom sheet içindeki genel kart radius'u
        sheetCardRadius: 12,
        // Modal kutu köşe radius'u
        modalRadius: 32,
        // Input ve küçük pill elemanları için radius
        inputRadius: 10,
        // Segmented/pill eleman radius'u
        pillRadius: 20,
        // İnce border kalınlığı (hairline yerine 1)
        borderThin: 0,
        // Orta border kalınlığı
        borderRegular: 1.5,
        // Separator çizgi kalınlığı
        separatorWidth: 1,
        // Handle kalınlık/yükseklik
        handleHeight: 4,
        // Handle genişliği
        handleWidth: 36,
        // Handle radius
        handleRadius: 2,
        // ---- Gölge ----
        // Bottom sheet gölge token'ı
        sheetShadow: {
            color: '#000000',
            opacity: 0.08,
            radius: 10,
            elevation: 3,
            offsetX: 0,
            offsetY: -2,
        } as ShadowToken,
        // Modal kart gölge token'ı
        modalShadow: {
            color: '#000000',
            opacity: 0.16,
            radius: 18,
            elevation: 8,
            offsetX: 0,
            offsetY: 8,
        } as ShadowToken,
    },
    dark: {
        // Tam ekran modal/sheet ana zemin rengi (Koyu tema)
        fullScreenBackground: '#080A0F',
        // Bottom sheet ana arka plan rengi (Koyu tema)
        sheetBackground: '#0F141C',
        // Bottom sheet tutamaç (handle) rengi
        sheetHandle: '#FFFFFF',
        // Bottom sheet sınır/ayraç ana rengi
        sheetBorder: '#38383A',
        // Sheet içinde kart benzeri ikincil yüzey rengi
        sheetCard: '#2C2C2E',
        // Sheet içinde ikincil/meta metin rengi
        sheetMutedText: '#888888',
        // Segmented control grup arka planı
        segmentedFill: '#2C2C2E',
        // Input alanı arka planı
        inputBackground: '#1C1C1E',
        // Preview yüzeyi (thumbnail vb.)
        previewSurface: '#2C2C2E',
        // Modal karartma katmanı (standart)
        modalOverlay: 'rgba(0,0,0,0.5)',
        // Modal karartma katmanı (yumuşak)
        modalOverlaySoft: 'rgba(0,0,0,0.45)',
        // Modal kutu arka plan rengi
        modalBackground: '#0F141C',
        // Modal ayraç (separator) rengi
        modalSeparator: '#38383A',
        // Vurgu rengi (accent)
        accent: '#3A8DFF',
        // Birincil aksiyon metni/ikon rengi
        actionPrimary: '#0A84FF',
        // Destructive aksiyon rengi
        actionDanger: '#FF453A',
        // ---- Boyut / Radius / Kalınlık ----
        // Bottom sheet üst köşe radius'u
        sheetTopRadius: 30,
        // Bottom sheet içindeki genel kart radius'u
        sheetCardRadius: 12,
        // Modal kutu köşe radius'u
        modalRadius: 32,
        // Input ve küçük pill elemanları için radius
        inputRadius: 10,
        // Segmented/pill eleman radius'u
        pillRadius: 20,
        // İnce border kalınlığı (hairline yerine 1)
        borderThin: 0,
        // Orta border kalınlığı
        borderRegular: 1.5,
        // Separator çizgi kalınlığı
        separatorWidth: 1,
        // Handle kalınlık/yükseklik
        handleHeight: 4,
        // Handle genişliği
        handleWidth: 36,
        // Handle radius
        handleRadius: 2,
        // ---- Gölge ----
        // Bottom sheet gölge token'ı
        sheetShadow: {
            color: '#000000',
            opacity: 0.35,
            radius: 16,
            elevation: 10,
            offsetX: 0,
            offsetY: -4,
        } as ShadowToken,
        // Modal kart gölge token'ı
        modalShadow: {
            color: '#000000',
            opacity: 0.5,
            radius: 24,
            elevation: 14,
            offsetX: 0,
            offsetY: 12,
        } as ShadowToken,
    },
} as const;

export type SurfaceThemePalette = (typeof SURFACE_THEME_TOKENS)['light'];
