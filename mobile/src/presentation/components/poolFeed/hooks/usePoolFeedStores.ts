import { useActiveVideoStore, useMuteControls } from '../../../store/useActiveVideoStore';
import { useAuthStore } from '../../../store/useAuthStore';

export const usePoolFeedActiveVideoStore = useActiveVideoStore;
export const usePoolFeedMuteControls = useMuteControls;
export const usePoolFeedAuthStore = useAuthStore;
