import { create } from 'zustand';

type PendingPhotoState = {
  /** Temporary uri of a just-picked photo, waiting for name + relation. */
  uri: string | null;
  setUri: (uri: string | null) => void;
};

/**
 * Hands the picked photo to the "Who is in this photo?" screen.
 * Not passed as a route param: Expo Go cache paths contain URL-encoded
 * segments (e.g. %40, %2F) that the router decodes, which breaks the uri.
 */
export const usePendingPhoto = create<PendingPhotoState>((set) => ({
  uri: null,
  setUri: (uri) => set({ uri }),
}));
