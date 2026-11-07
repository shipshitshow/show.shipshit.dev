'use client';

import { createContext, useContext, useState } from 'react';

/** The livestream the page is about, for its nested pages in the sidebar. */
export interface SidebarEpisode {
  hasTranscript: boolean;
  slug: string;
  title: string;
}

interface SidebarState {
  /** The content agent column on the right. */
  agentOpen: boolean;
  collapsed: boolean;
  episode: SidebarEpisode | null;
  setEpisode: (episode: SidebarEpisode | null) => void;
  toggle: () => void;
  toggleAgent: () => void;
}

const SidebarStateContext = createContext<SidebarState>({
  agentOpen: false,
  collapsed: false,
  episode: null,
  setEpisode: () => {},
  toggle: () => {},
  toggleAgent: () => {},
});

export function SidebarStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [episode, setEpisode] = useState<SidebarEpisode | null>(null);
  return (
    <SidebarStateContext.Provider
      value={{
        agentOpen,
        collapsed,
        episode,
        setEpisode,
        toggle: () => setCollapsed((prev) => !prev),
        toggleAgent: () => setAgentOpen((prev) => !prev),
      }}
    >
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarState {
  return useContext(SidebarStateContext);
}
