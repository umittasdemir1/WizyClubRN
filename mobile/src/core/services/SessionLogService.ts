import { supabase } from '../supabase';
import { logError, LogCode } from './Logger';

export interface SessionData {
    userId: string;
    ipAddress?: string;
    deviceBrand?: string;
    deviceModel?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
    eventType: 'login' | 'logout' | 'app_open' | 'profile_update' | 'video_upload';
}

export class SessionLogService {
    static async logEvent(data: SessionData): Promise<void> {
        const { error } = await supabase
            .from('user_sessions')
            .insert({
                user_id: data.userId,
                ip_address: data.ipAddress,
                device_brand: data.deviceBrand,
                device_model: data.deviceModel,
                os_name: data.osName,
                os_version: data.osVersion,
                app_version: data.appVersion,
                event_type: data.eventType
            });

        if (error) {
            logError(LogCode.DB_ERROR, 'Session log service error logging event', { error, eventType: data.eventType, userId: data.userId });
        }
    }
}
