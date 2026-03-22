import type {
    AuthChangeEvent,
    AuthError,
    Session,
    Subscription,
} from '@supabase/supabase-js';
import type {
    AuthCredentialsResult,
    AuthSessionResult,
    IAuthRepository,
} from '../../domain/repositories/IAuthRepository';
import { SupabaseAuthDataSource } from '../datasources/SupabaseAuthDataSource';

export class AuthRepositoryImpl implements IAuthRepository {
    private readonly dataSource: SupabaseAuthDataSource;

    constructor() {
        this.dataSource = new SupabaseAuthDataSource();
    }

    getSession(): Promise<AuthSessionResult> {
        return this.dataSource.getSession();
    }

    signIn(email: string, password: string): Promise<AuthCredentialsResult> {
        return this.dataSource.signIn(email, password);
    }

    signUp(email: string, password: string, fullName: string): Promise<AuthCredentialsResult> {
        return this.dataSource.signUp(email, password, fullName);
    }

    signOut(): Promise<AuthError | null> {
        return this.dataSource.signOut();
    }

    getAccessToken(): Promise<string | null> {
        return this.dataSource.getAccessToken();
    }

    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): Subscription {
        return this.dataSource.onAuthStateChange(callback);
    }
}
