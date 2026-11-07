'use client';

import { useEffect } from 'react';
import { type SidebarEpisode, useSidebarState } from './SidebarStateContext';

/** Tells the sidebar which livestream this page is about, while it is open. */
export function EpisodeSidebarRegistrar(episode: SidebarEpisode) {
  const { setEpisode } = useSidebarState();
  const { hasTranscript, slug, title } = episode;
  useEffect(() => {
    setEpisode({ hasTranscript, slug, title });
    return () => setEpisode(null);
  }, [hasTranscript, setEpisode, slug, title]);
  return null;
}
