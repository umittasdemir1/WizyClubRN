import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDraftStore } from '../store/useDraftStore';
import { useAuthStore } from '../store/useAuthStore';
import { CONFIG } from '../../core/config';

const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export function useDraftCleanup() {
  const { user } = useAuthStore();
  const { fetchDrafts } = useDraftStore();

  useEffect(() => {
    if (!user?.id) return;

    // Initial cleanup on mount
    cleanupExpiredDrafts();

    // Schedule periodic cleanup
    const interval = setInterval(cleanupExpiredDrafts, CLEANUP_INTERVAL);

    // Cleanup on app state change (foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user?.id]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && user?.id) {
      cleanupExpiredDrafts();
    }
  };

  const cleanupExpiredDrafts = async () => {
    if (!user?.id) return;

    try {
      // Call backend cleanup endpoint
      const response = await fetch(`${CONFIG.API_URL}/drafts/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const text = await response.text();
        // Log truncated text to avoid flooding logs with HTML
        console.warn(`[Cleanup] Server returned ${response.status}. Response: ${text.substring(0, 100)}...`);
        return;
      }

      const result = await response.json();

      if (result.success && result.deletedCount > 0) {
        console.log(`🧹 [Cleanup] Removed ${result.deletedCount} expired drafts`);
        // Refresh drafts list
        fetchDrafts(user.id);
      }
    } catch (error) {
      console.error('[Cleanup] Error cleaning up expired drafts:', error);
    }
  };
}
