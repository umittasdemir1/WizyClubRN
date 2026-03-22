import { create } from 'zustand';

interface NotificationState {
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    incrementUnread: () => void;
    markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    setUnreadCount: (count) => set({ unreadCount: count }),
    incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
    markAllAsRead: () => set({ unreadCount: 0 }),
}));
