'use client';

import { useCallback } from 'react';
import { type SidebarEpisode, useSidebarState } from './SidebarStateContext';

/**
 * Tells the sidebar which livestream this page is about, while it is open.
 *
 * The sidebar sits above the page in the tree and cannot be given props from a
 * layout, so the page hands it the episode when this element mounts and takes
 * it back when it unmounts. That is a ref callback with a cleanup, which React
 * runs on mount, on unmount and whenever the episode changes.
 */
export function EpisodeSidebarRegistrar(episode: SidebarEpisode) {
  const { setEpisode } = useSidebarState();
  const { hasTranscript, slug, title } = episode;
  const register = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      setEpisode({ hasTranscript, slug, title });
      return () => setEpisode(null);
    },
    [hasTranscript, setEpisode, slug, title],
  );
  return <span hidden ref={register} />;
}
