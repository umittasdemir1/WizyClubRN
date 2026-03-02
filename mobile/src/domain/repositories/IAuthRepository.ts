import type {
    AuthChangeEvent,
    AuthError,
    Session,
    Subscription,
    User as SupabaseUser,
} from '@supabase/supabase-js';

export interface AuthSessionResult {
    session: Session | null;
    error: AuthError | null;
}

export interface AuthCredentialsResult {
    user: SupabaseUser | null;
    session: Session | null;
    error: AuthError | null;
}

export interface IAuthRepository {
    getSession(): Promise<AuthSessionResult>;
    signIn(email: string, password: string): Promise<AuthCredentialsResult>;
    signUp(email: string, password: string, fullName: string): Promise<AuthCredentialsResult>;
    signOut(): Promise<AuthError | null>;
    getAccessToken(): Promise<string | null>;
    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): Subscription;
}
