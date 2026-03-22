export const CONFIG = {
    // Reads from .env file - different for each environment
    // Set EXPO_PUBLIC_API_URL in your local .env file
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.138:3000',
    REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
    REVENUECAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
};
