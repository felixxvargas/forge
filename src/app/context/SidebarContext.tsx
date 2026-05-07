'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextValue {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({ isOpen: false, setIsOpen: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return <SidebarContext.Provider value={{ isOpen, setIsOpen }}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);
