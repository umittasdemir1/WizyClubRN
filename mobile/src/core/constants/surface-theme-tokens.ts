/**
 * @file surface-theme-tokens.ts
 * @description
 * WizyClub uygulamasının modern yüzey, gölge ve boyutlandırma sistemi.
 * Bu dosya, modal, sheet ve kart gibi yüzeylerin tasarım dilini (Design System) yönetir.
 * 
 * YAPILANDIRMA:
 * - Renkler (Light/Dark)
 * - Boyutlar (Radius, Kalınlık)
 * - Gölgeler (Shadows)
 */

/**
 * Gölge tanımı için kullanılan tip.
 * React Native gölge prop'larına (shadowColor, shadowOffset vb.) dönüştürülebilir.
 */
export type ShadowToken = {
    color: string;
    opacity: number;
    radius: number;
    elevation: number;
    offsetX: number;
    offsetY: number;
};

// ===================================
// 📏 BOYUT VE YAPISAL TANIMLAR (ORTAK)
//Light ve Dark mod arasında değişmeyen sabit değerler
// ===================================
const COMMON_DIMENSIONS = {
    // ---- Bottom Sheet ----
    sheetTopRadius: 30,      // Sheet üst köşelerinin yuvarlaklığı
    sheetCardRadius: 12,     // Sheet içindeki kartların yuvarlaklığı
    handleHeight: 4,         // Tutamaç (handle) yüksekliği
    handleWidth: 36,         // Tutamaç (handle) genişliği
    handleRadius: 2,         // Tutamaç yuvarlaklığı

    // ---- Modal ----
    modalRadius: 32,         // Modal kutusunun köşe yuvarlaklığı

    // ---- Form Elementleri ----
    inputRadius: 10,         // Input alanlarının köşe yuvarlaklığı
    pillRadius: 20,          // Hap (pill) şeklindeki buton/etiketlerin yuvarlaklığı

    // ---- Sınır Çizgileri (Borders) ----
    borderThin: 0,           // İnce kenarlık (genelde 0 veya hairline)
    borderRegular: 1.5,      // Normal kenarlık kalınlığı
    separatorWidth: 1,       // Liste elemanları arası ayraç kalınlığı (Light için default)
    separatorWidthDark: 0.5 // Dark mod için daha ince ayraç
} as const;

// ===================================
// 🌑 GÖLGE TANIMLARI (PRESETS)
// ===================================
const SHADOWS = {
    light: {
        sheet: {
            color: '#000000',
            opacity: 0.08,
            radius: 10,
            elevation: 3,
            offsetX: 0,
            offsetY: -2,
        } as ShadowToken,
        modal: {
            color: '#000000',
            opacity: 0.16,
            radius: 18,
            elevation: 8,
            offsetX: 0,
            offsetY: 8,
        } as ShadowToken,
    },
    dark: {
        sheet: {
            color: '#000000',
            opacity: 0.35,
            radius: 16,
            elevation: 10,
            offsetX: 0,
            offsetY: -4,
        } as ShadowToken,
        modal: {
            color: '#000000',
            opacity: 0.5,
            radius: 24,
            elevation: 14,
            offsetX: 0,
            offsetY: 12,
        } as ShadowToken,
    },
} as const;

// ===================================
// 🎨 TEMAYA ÖZEL RENKLER
// ===================================

/**
 * Açık Tema (Light Mode) Tokenları
 */
const LIGHT_THEME = {
    // ---- Ana Yüzeyler ----
    fullScreenBackground: '#FFFFFF', // Tam ekran modal/sheet arkası
    sheetBackground: '#FFFFFF',      // Bottom sheet ana zemin
    modalBackground: '#FFFFFF',      // Modal kutu ana zemin

    // ---- İkincil Yüzeyler ----
    sheetCard: '#F0F0F0',            // Sheet içindeki gruplanmış alanlar
    inputBackground: '#F5F5F5',      // Input alanları
    segmentedFill: '#EDEDF0',        // Segmented control arka planı
    previewSurface: '#F5F5F5',       // Önizleme alanları (ör. link preview)

    // ---- Dekoratif ----
    sheetHandle: '#000000',          // Tutamaç rengi
    sheetBorder: '#E5E5E5',          // Sheet sınır çizgisi
    modalSeparator: '#E5E5EA',       // Modal içi ayraçlar
    modalOverlay: 'rgba(0,0,0,0.5)', // Arka plan karartma (Standart)
    modalOverlaySoft: 'rgba(0,0,0,0.45)', // Arka plan karartma (Hafif)

    // ---- Metin & İkon ----
    sheetMutedText: '#555555',       // Açıklama metinleri
    actionPrimary: '#0A84FF',        // Ana aksiyon (Tamam, Kaydet)
    actionDanger: '#FF453A',         // Tehlikeli aksiyon (Sil, Çık)
    accent: '#3A8DFF',               // Vurgu rengi

    // ---- Miras Alınan Boyutlar ----
    ...COMMON_DIMENSIONS,
    separatorWidth: COMMON_DIMENSIONS.separatorWidth, // Explicit override if needed

    // ---- Gölgeler ----
    sheetShadow: SHADOWS.light.sheet,
    modalShadow: SHADOWS.light.modal,
} as const;

/**
 * Koyu Tema (Dark Mode) Tokenları
 */
const DARK_THEME = {
    // ---- Ana Yüzeyler ----
    fullScreenBackground: '#080A0F', // Tam ekran modal/sheet arkası
    sheetBackground: '#080A0F',      // Bottom sheet ana zemin
    modalBackground: '#080A0F',      // Modal kutu ana zemin

    // ---- İkincil Yüzeyler ----
    sheetCard: '#2C2C2E',            // Sheet içindeki gruplanmış alanlar
    inputBackground: '#1C1C1E',      // Input alanları
    segmentedFill: '#2C2C2E',        // Segmented control arka planı
    previewSurface: '#2C2C2E',       // Önizleme alanları

    // ---- Dekoratif ----
    sheetHandle: '#FFFFFF',          // Tutamaç rengi
    sheetBorder: '#38383A',          // Sheet sınır çizgisi
    modalSeparator: '#38383A',       // Modal içi ayraçlar
    modalOverlay: 'rgba(0,0,0,0.5)', // Arka plan karartma (Standart)
    modalOverlaySoft: 'rgba(0,0,0,0.45)', // Arka plan karartma (Hafif)

    // ---- Metin & İkon ----
    sheetMutedText: '#888888',       // Açıklama metinleri
    actionPrimary: '#0A84FF',        // Ana aksiyon
    actionDanger: '#FF453A',         // Tehlikeli aksiyon
    accent: '#3A8DFF',               // Vurgu rengi

    // ---- Miras Alınan Boyutlar ----
    ...COMMON_DIMENSIONS,
    separatorWidth: COMMON_DIMENSIONS.separatorWidthDark, // Dark mod için özel ince ayraç

    // ---- Gölgeler ----
    sheetShadow: SHADOWS.dark.sheet,
    modalShadow: SHADOWS.dark.modal,
} as const;

// ===================================
// 🚀 DIŞARI AKTARIM (EXPORT)
// ===================================

/**
 * Tüm tema tokenlarını içeren ana obje.
 * `useSurfaceTheme` hook'u tarafından kullanılır.
 */
export const SURFACE_THEME_TOKENS = {
    light: LIGHT_THEME,
    dark: DARK_THEME,
} as const;

/**
 * Tip tanımları
 */
export type SurfaceThemePalette = typeof LIGHT_THEME;
