import { create } from 'zustand';
import { supabase } from '../../core/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  user: SupabaseUser | null;
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
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthStore] Session error:', error);
        set({ user: null, isLoading: false, isInitialized: true });
        return;
      }

      set({
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[AuthStore] Auth state changed:', _event);
        set({ user: session?.user ?? null });
      });
    } catch (err) {
      console.error('[AuthStore] Initialize error:', err);
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthStore] Sign in error:', error);
        let errorMessage = 'Giriş yapılırken bir hata oluştu.';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-posta veya şifre hatalı.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'E-posta adresiniz henüz doğrulanmamış.';
        }

        set({ isLoading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }

      set({ user: data.user, isLoading: false, error: null });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthStore] Sign in error:', err);
      const errorMessage = 'Beklenmeyen bir hata oluştu.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ isLoading: true, error: null });

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('[AuthStore] Sign up error:', error);
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

      // Create profile in profiles table
      if (data.user) {
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            full_name: fullName,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`,
          });

        if (profileError) {
          console.warn('[AuthStore] Profile creation warning:', profileError);
        }
      }

      set({ isLoading: false, error: null });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthStore] Sign up error:', err);
      const errorMessage = 'Beklenmeyen bir hata oluştu.';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, error: null });
    } catch (err) {
      console.error('[AuthStore] Sign out error:', err);
    }
  },

  clearError: () => set({ error: null }),
}));
