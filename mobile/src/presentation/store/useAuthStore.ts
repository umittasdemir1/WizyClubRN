import { create } from 'zustand';
import { supabase } from '../../core/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  user: SupabaseUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

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

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (err) {
      console.error('[AuthStore] Sign out error:', err);
    }
  },
}));
