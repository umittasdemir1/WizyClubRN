import { create } from 'zustand';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { LogCode, logAuth, logError } from '@/core/services/Logger';

const authRepository = new AuthRepositoryImpl();
const profileRepository = new ProfileRepositoryImpl();

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;  // 🔥 JWT token access
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const { session, error } = await authRepository.getSession();

      if (error) {
        logError(LogCode.AUTH_SESSION_CHECK, 'Session check failed', error);
        set({ user: null, session: null, isLoading: false, isInitialized: true });
        return;
      }

      logAuth(LogCode.AUTH_SESSION_CHECK, 'Session initialized', { userId: session?.user?.id });
      set({
        user: session?.user ?? null,
        session: session ?? null,
        isLoading: false,
        isInitialized: true
      });

      // Listen for auth changes
      authRepository.onAuthStateChange((_event, session) => {
        logAuth(LogCode.AUTH_TOKEN_REFRESH, `Auth state changed: ${_event}`, { userId: session?.user?.id });
        set({ user: session?.user ?? null, session: session ?? null });
      });
    } catch (err) {
      logError(LogCode.SUPABASE_ERROR, 'Auth initialize failed', err);
      set({ user: null, session: null, isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, session, error } = await authRepository.signIn(email, password);

      if (error) {
        logError(LogCode.AUTH_LOGIN_FAILED, 'Sign in failed', { email, error: error.message });
        let errorMessage = 'Giriş yapılırken bir hata oluştu.';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-posta veya şifre hatalı.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'E-posta adresiniz henüz doğrulanmamış.';
        }

        set({ isLoading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }

      logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'User signed in', { userId: user?.id, email });
      set({ user, session, isLoading: false, error: null });
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      logError(LogCode.AUTH_LOGIN_FAILED, 'Sign in exception', err);
      const errorMessage = 'Beklenmeyen bir hata oluştu.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ isLoading: true, error: null });

      // Create auth user
      const { user, error } = await authRepository.signUp(email, password, fullName);

      if (error) {
        logError(LogCode.AUTH_LOGIN_FAILED, 'Sign up failed', { email, error: error.message });
        let errorMessage = 'Kayıt olurken bir hata oluştu.';

        if (error.message.includes('User already registered')) {
          errorMessage = 'Bu e-posta adresi zaten kayıtlı.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Şifre en az 6 karakter olmalı.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Geçersiz e-posta adresi.';
        }

        set({ isLoading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }

      // Bootstrap the profile record via the data layer so store code stays auth-focused.
      if (user) {
        const username = await profileRepository.bootstrapProfileForSignUp(user.id, email, fullName);

        if (username) {
          logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'User profile created', { userId: user.id, username });
        }
      }

      set({ isLoading: false, error: null });
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      logError(LogCode.AUTH_LOGIN_FAILED, 'Sign up exception', err);
      const errorMessage = 'Beklenmeyen bir hata oluştu.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    try {
      const error = await authRepository.signOut();
      if (error) {
        throw error;
      }
      logAuth(LogCode.AUTH_LOGOUT, 'User signed out');
      set({ user: null, error: null });
    } catch (err) {
      logError(LogCode.AUTH_LOGOUT, 'Sign out failed', err);
    }
  },

  clearError: () => set({ error: null }),
}));
