import { createContext, useContext } from 'react';

export type AddKind = 'lesson' | 'material' | 'official' | 'thesis' | 'task' | 'event' | 'email';

export type AppCtx = {
  refreshKey: number;
  bump: () => void;
  toast: (msg: string, kind?: 'ok' | 'error') => void;
  openAdd: (kind: AddKind, preset?: Record<string, any>) => void;
  mode: 'real' | 'demo';
  setMode: (m: 'real' | 'demo') => void;
};

export const AppContext = createContext<AppCtx>({
  refreshKey: 0,
  bump: () => {},
  toast: () => {},
  openAdd: () => {},
  mode: 'real',
  setMode: () => {},
});

export const useApp = () => useContext(AppContext);
