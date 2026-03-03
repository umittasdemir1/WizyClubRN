function validateEnv(env = process.env) {
    const missing = [];

    if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_KEY) {
        missing.push('SUPABASE_SERVICE_ROLE_KEY|SUPABASE_KEY');
    }
    if (!env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
    if (!env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
    if (!env.R2_PUBLIC_URL) missing.push('R2_PUBLIC_URL');

    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }

    return {
        supabaseUrl: env.SUPABASE_URL,
        supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY,
        supabaseAuthKey: env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
        googlePlacesApiKey: env.GOOGLE_PLACES_API_KEY || env.GOOGLE_MAPS_API_KEY || '',
        r2AccountId: env.R2_ACCOUNT_ID,
        r2AccessKeyId: env.R2_ACCESS_KEY_ID,
        r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
        r2BucketName: env.R2_BUCKET_NAME,
        r2PublicUrl: env.R2_PUBLIC_URL,
        port: Number.parseInt(String(env.PORT || ''), 10),
    };
}

module.exports = {
    validateEnv,
};
