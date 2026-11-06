'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarState {
  /** The content agent column on the right. */
  agentOpen: boolean;
  collapsed: boolean;
  toggle: () => void;
  toggleAgent: () => void;
}

const SidebarStateContext = createContext<SidebarState>({
  agentOpen: false,
  collapsed: false,
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
  return (
    <SidebarStateContext.Provider
      value={{
        agentOpen,
        collapsed,
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
