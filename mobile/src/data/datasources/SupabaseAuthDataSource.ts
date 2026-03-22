import { supabase } from '../../core/supabase';
import type {
    AuthChangeEvent,
    AuthError,
    Session,
    Subscription,
    User as SupabaseUser,
} from '@supabase/supabase-js';

type AuthCredentialsResult = {
    user: SupabaseUser | null;
    session: Session | null;
    error: AuthError | null;
};

export class SupabaseAuthDataSource {
    async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { session, error };
    }

    async signIn(email: string, password: string): Promise<AuthCredentialsResult> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return {
            user: data.user ?? null,
            session: data.session ?? null,
            error,
        };
    }

    async signUp(email: string, password: string, fullName: string): Promise<AuthCredentialsResult> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        return {
            user: data.user ?? null,
            session: data.session ?? null,
            error,
        };
    }

    async signOut(): Promise<AuthError | null> {
        const { error } = await supabase.auth.signOut();
        return error;
    }

    async getAccessToken(): Promise<string | null> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    }

    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): Subscription {
        const { data } = supabase.auth.onAuthStateChange(callback);
        return data.subscription;
    }
}
