import { useActiveVideoStore, useMuteControls } from '../../../store/useActiveVideoStore';
import { useAuthStore } from '../../../store/useAuthStore';

export const useInfiniteFeedActiveVideoStore = useActiveVideoStore;
export const useInfiniteFeedMuteControls = useMuteControls;
export const useInfiniteFeedAuthStore = useAuthStore;
