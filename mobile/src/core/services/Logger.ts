/**
 * Professional Logging System
 *
 * Log Categories & Code Ranges:
 * - 1xxx: Authentication & Supabase
 * - 2xxx: Video & Media
 * - 3xxx: Cache & Storage
 * - 4xxx: Network & API
 * - 5xxx: UI & Navigation
 * - 6xxx: Performance & Metrics
 * - 7xxx: Data & Repositories
 * - 8xxx: Errors & Exceptions
 * - 9xxx: General & System
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

export enum LogCode {
    // 1xxx: Authentication & Supabase
    AUTH_LOGIN_START = 1001,
    AUTH_LOGIN_SUCCESS = 1002,
    AUTH_LOGIN_FAILED = 1003,
    AUTH_LOGOUT = 1004,
    AUTH_SESSION_CHECK = 1005,
    AUTH_TOKEN_REFRESH = 1006,
    AUTH_GOOGLE_SIGNIN = 1007,
    AUTH_APPLE_SIGNIN = 1008,
    SUPABASE_INIT = 1010,
    SUPABASE_CONNECTION = 1011,
    SUPABASE_ERROR = 1012,

    // 2xxx: Video & Media
    VIDEO_LOAD_START = 2001,
    VIDEO_LOAD_SUCCESS = 2002,
    VIDEO_LOAD_ERROR = 2003,
    VIDEO_PLAYBACK_START = 2004,
    VIDEO_PLAYBACK_PAUSE = 2005,
    VIDEO_PLAYBACK_ERROR = 2006,
    VIDEO_BUFFER_START = 2007,
    VIDEO_BUFFER_END = 2008,
    VIDEO_QUALITY_CHANGE = 2009,
    VIDEO_UPLOAD_START = 2010,
    VIDEO_UPLOAD_PROGRESS = 2011,
    VIDEO_UPLOAD_SUCCESS = 2012,
    VIDEO_UPLOAD_ERROR = 2013,
    VIDEO_COMPRESSION_START = 2014,
    VIDEO_COMPRESSION_SUCCESS = 2015,
    VIDEO_COMPRESSION_ERROR = 2016,
    VIDEO_FEED_READY = 2017,
    MEDIA_PICKER_OPEN = 2020,
    MEDIA_PICKER_SELECT = 2021,
    MEDIA_PICKER_ERROR = 2022,
    CAMERA_INIT = 2030,
    CAMERA_CAPTURE = 2031,
    CAMERA_ERROR = 2032,
    VIDEO_POSITION_SAVED = 2033,
    VIDEO_PRELOAD_INDICES = 2034,
    VIDEO_DELETE_PERMANENT = 2035,
    VIDEO_DELETE_ERROR = 2036,

    // 3xxx: Cache & Storage
    CACHE_INIT = 3001,
    CACHE_HIT = 3002,
    CACHE_MISS = 3003,
    CACHE_SET = 3004,
    CACHE_DELETE = 3005,
    CACHE_CLEAR = 3006,
    CACHE_PRUNE = 3007,
    CACHE_ERROR = 3008,
    CACHE_WARMUP = 3009,
    STORAGE_READ = 3010,
    STORAGE_WRITE = 3011,
    STORAGE_DELETE = 3012,
    STORAGE_ERROR = 3013,
    CACHE_STARTUP_COMPLETE = 3014,
    ASYNC_STORAGE_GET = 3020,
    ASYNC_STORAGE_SET = 3021,
    ASYNC_STORAGE_ERROR = 3022,

    // 4xxx: Network & API
    API_REQUEST_START = 4001,
    API_REQUEST_SUCCESS = 4002,
    API_REQUEST_ERROR = 4003,
    API_TIMEOUT = 4004,
    API_RETRY = 4005,
    API_ERROR = 4006,
    NETWORK_ONLINE = 4010,
    NETWORK_OFFLINE = 4011,
    NETWORK_SLOW = 4012,
    FETCH_START = 4020,
    FETCH_SUCCESS = 4021,
    FETCH_ERROR = 4022,

    // 5xxx: UI & Navigation
    NAVIGATION_CHANGE = 5001,
    SCREEN_MOUNT = 5002,
    SCREEN_UNMOUNT = 5003,
    MODAL_OPEN = 5004,
    MODAL_CLOSE = 5005,
    SHEET_OPEN = 5006,
    SHEET_CLOSE = 5007,
    MODAL_ACTION = 5008,
    SHEET_ACTION = 5009,
    INTERACTION_TAP = 5010,
    INTERACTION_SWIPE = 5011,
    INTERACTION_SCROLL = 5012,
    UI_INTERACTION = 5013,
    UI_RENDER = 5020,
    UI_ERROR = 5021,
    STORY_BAR_VISIBLE = 5030,
    STORY_LOADED = 5031,
    STORY_COMMERCIAL_PRESSED = 5032,

    // 6xxx: Performance & Metrics
    PERF_MEASURE_START = 6001,
    PERF_MEASURE_END = 6002,
    PERF_SLOW_RENDER = 6003,
    PERF_MEMORY_WARNING = 6004,
    PERF_FPS_DROP = 6005,
    PERF_BUNDLE_LOAD = 6006,
    PREFETCH_START = 6010,
    PREFETCH_SUCCESS = 6011,
    PREFETCH_ERROR = 6012,
    POOL_CREATE = 6020,
    POOL_ACQUIRE = 6021,
    POOL_RELEASE = 6022,
    POOL_CLEANUP = 6023,

    // 7xxx: Data & Repositories
    DB_QUERY_START = 7001,
    DB_QUERY_SUCCESS = 7002,
    DB_QUERY_ERROR = 7003,
    DB_INSERT = 7004,
    DB_UPDATE = 7005,
    DB_DELETE = 7006,
    DB_ERROR = 7007,
    REPO_FETCH = 7010,
    REPO_SAVE = 7011,
    REPO_DELETE = 7012,
    REPO_ERROR = 7013,
    DRAFT_SAVE = 7020,
    DRAFT_DELETE = 7021,
    DRAFT_CLEANUP = 7022,
    DRAFT_CLEANUP_SUCCESS = 7023,
    DRAFT_CLEANUP_ERROR = 7024,
    SOCIAL_SYNC_IGNORED = 7030,
    SOCIAL_FOLLOW_ERROR = 7031,

    // 8xxx: Errors & Exceptions
    ERROR_CAUGHT = 8001,
    ERROR_BOUNDARY = 8002,
    ERROR_NETWORK = 8003,
    ERROR_TIMEOUT = 8004,
    ERROR_PARSE = 8005,
    ERROR_VALIDATION = 8006,
    ERROR_PERMISSION = 8007,
    ERROR_NOT_FOUND = 8008,
    ERROR_UNAUTHORIZED = 8009,
    EXCEPTION_UNCAUGHT = 8010,
    EXCEPTION_PROMISE = 8011,
    ERROR_NAVIGATION = 8012,
    SHARE_ERROR = 8020,
    STORY_VIEW_ERROR = 8021,

    // 9xxx: General & System
    APP_START = 9001,
    APP_READY = 9002,
    APP_BACKGROUND = 9003,
    APP_FOREGROUND = 9004,
    APP_CRASH = 9005,
    STATE_CHANGE = 9010,
    STORE_INIT = 9011,
    STORE_UPDATE = 9012,
    CONFIG_LOAD = 9020,
    FEATURE_FLAG = 9021,
    DEBUG_INFO = 9030,
    WARNING_IGNORED = 9031,
}

interface LogEntry {
    code: LogCode;
    level: LogLevel;
    message: string;
    data?: any;
    module?: string;
}

class LoggerService {
    private static instance: LoggerService;
    private minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
    private enabled: boolean = true;

    // Color codes for terminal output
    private colors = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m',  // Green
        WARN: '\x1b[33m',  // Yellow
        ERROR: '\x1b[31m', // Red
        RESET: '\x1b[0m',
        BOLD: '\x1b[1m',
        DIM: '\x1b[2m',
    };

    private constructor() {}

    static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    setMinLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    private getLogLevelName(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG: return 'DEBUG';
            case LogLevel.INFO: return 'INFO';
            case LogLevel.WARN: return 'WARN';
            case LogLevel.ERROR: return 'ERROR';
            default: return 'UNKNOWN';
        }
    }

    private getLogLevelColor(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG: return this.colors.DEBUG;
            case LogLevel.INFO: return this.colors.INFO;
            case LogLevel.WARN: return this.colors.WARN;
            case LogLevel.ERROR: return this.colors.ERROR;
            default: return this.colors.RESET;
        }
    }

    private getCategoryFromCode(code: LogCode): string {
        const codeNum = code;
        if (codeNum >= 1000 && codeNum < 2000) return 'AUTH';
        if (codeNum >= 2000 && codeNum < 3000) return 'VIDEO';
        if (codeNum >= 3000 && codeNum < 4000) return 'CACHE';
        if (codeNum >= 4000 && codeNum < 5000) return 'NETWORK';
        if (codeNum >= 5000 && codeNum < 6000) return 'UI';
        if (codeNum >= 6000 && codeNum < 7000) return 'PERF';
        if (codeNum >= 7000 && codeNum < 8000) return 'DATA';
        if (codeNum >= 8000 && codeNum < 9000) return 'ERROR';
        if (codeNum >= 9000 && codeNum < 10000) return 'SYSTEM';
        return 'UNKNOWN';
    }

    private formatMessage(entry: LogEntry): string {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const levelName = this.getLogLevelName(entry.level);
        const category = this.getCategoryFromCode(entry.code);
        const module = entry.module ? `[${entry.module}]` : '';

        if (__DEV__) {
            const color = this.getLogLevelColor(entry.level);
            const reset = this.colors.RESET;
            const bold = this.colors.BOLD;
            const dim = this.colors.DIM;

            return `${dim}${timestamp}${reset} ${color}${bold}[${levelName}]${reset} ${bold}[${entry.code}]${reset} ${dim}${category}${reset} ${module} ${entry.message}`;
        } else {
            return `${timestamp} [${levelName}] [${entry.code}] ${category} ${module} ${entry.message}`;
        }
    }

    private log(entry: LogEntry): void {
        if (!this.enabled || entry.level < this.minLevel) {
            return;
        }

        const message = this.formatMessage(entry);

        switch (entry.level) {
            case LogLevel.DEBUG:
            case LogLevel.INFO:
                console.log(message, entry.data || '');
                break;
            case LogLevel.WARN:
                console.warn(message, entry.data || '');
                break;
            case LogLevel.ERROR:
                console.error(message, entry.data || '');
                break;
        }
    }

    debug(code: LogCode, message: string, data?: any, module?: string): void {
        this.log({ code, level: LogLevel.DEBUG, message, data, module });
    }

    info(code: LogCode, message: string, data?: any, module?: string): void {
        this.log({ code, level: LogLevel.INFO, message, data, module });
    }

    warn(code: LogCode, message: string, data?: any, module?: string): void {
        this.log({ code, level: LogLevel.WARN, message, data, module });
    }

    error(code: LogCode, message: string, data?: any, module?: string): void {
        this.log({ code, level: LogLevel.ERROR, message, data, module });
    }
}

// Export singleton instance
export const Logger = LoggerService.getInstance();

// Convenience exports for common patterns
export const logAuth = (code: LogCode, message: string, data?: any) =>
    Logger.info(code, message, data, 'Auth');

export const logVideo = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Video');

export const logCache = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Cache');

export const logNetwork = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Network');

export const logApi = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'API');

export const logUI = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'UI');

export const logStory = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Story');

export const logPerf = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Performance');

export const logData = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Data');

export const logRepo = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Repo');

export const logSheet = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Sheet');

export const logStorage = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Storage');

export const logSocial = (code: LogCode, message: string, data?: any) =>
    Logger.debug(code, message, data, 'Social');

export const logError = (code: LogCode, message: string, error?: any) =>
    Logger.error(code, message, error, 'Error');

export const logSystem = (code: LogCode, message: string, data?: any) =>
    Logger.info(code, message, data, 'System');
