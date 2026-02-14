import { create } from 'zustand';
import type { AttensaAPI } from '../../preload/index';

declare global {
  interface Window {
    attensa: AttensaAPI;
  }
}

interface SessionState {
  isActive: boolean;
  sessionId: string | null;
  remainingMs: number;
  plannedDurationMs: number;
  appSwitchCount: number;
  currentApp: string;
  startSession: (durationMs: number) => Promise<void>;
  stopSession: () => Promise<void>;
  cancelSession: () => Promise<void>;
  updateTick: (data: { remainingMs: number; appSwitchCount: number; currentApp: string }) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isActive: false,
  sessionId: null,
  remainingMs: 0,
  plannedDurationMs: 0,
  appSwitchCount: 0,
  currentApp: '',

  startSession: async (durationMs) => {
    const sessionId = await window.attensa.session.start(durationMs);
    set({
      isActive: true,
      sessionId,
      remainingMs: durationMs,
      plannedDurationMs: durationMs,
      appSwitchCount: 0,
      currentApp: '',
    });
  },

  stopSession: async () => {
    await window.attensa.session.stop();
    set({ isActive: false });
  },

  cancelSession: async () => {
    await window.attensa.session.cancel();
    set({ isActive: false, sessionId: null, remainingMs: 0, appSwitchCount: 0, currentApp: '' });
  },

  updateTick: (data) => {
    set({
      remainingMs: data.remainingMs,
      appSwitchCount: data.appSwitchCount,
      currentApp: data.currentApp,
    });
  },

  reset: () => {
    set({
      isActive: false,
      sessionId: null,
      remainingMs: 0,
      plannedDurationMs: 0,
      appSwitchCount: 0,
      currentApp: '',
    });
  },
}));
