import { contextBridge, ipcRenderer } from 'electron';

export interface AttensaAPI {
  session: {
    start: (plannedDurationMs: number) => Promise<string>;
    stop: () => Promise<void>;
    cancel: () => Promise<void>;
    delete: (id: string) => Promise<void>;
    getActive: () => Promise<any | null>;
    getById: (id: string) => Promise<any | null>;
    getRecent: (limit?: number) => Promise<any[]>;
    getAll: () => Promise<any[]>;
    getMetrics: (id: string) => Promise<any | null>;
    onTick: (callback: (data: { remainingMs: number; appSwitchCount: number; currentApp: string }) => void) => () => void;
    onEnd: (callback: (sessionId: string) => void) => () => void;
  };
  insights: {
    generate: (sessionId: string) => Promise<any>;
  };
  recap: {
    getMonthly: (yearMonth: string) => Promise<any | null>;
    generate: (yearMonth: string) => Promise<any>;
  };
  settings: {
    get: () => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
}

const api: AttensaAPI = {
  session: {
    start: (plannedDurationMs) => ipcRenderer.invoke('session:start', plannedDurationMs),
    stop: () => ipcRenderer.invoke('session:stop'),
    cancel: () => ipcRenderer.invoke('session:cancel'),
    delete: (id) => ipcRenderer.invoke('session:delete', id),
    getActive: () => ipcRenderer.invoke('session:getActive'),
    getById: (id) => ipcRenderer.invoke('session:getById', id),
    getRecent: (limit = 5) => ipcRenderer.invoke('session:getRecent', limit),
    getAll: () => ipcRenderer.invoke('session:getAll'),
    getMetrics: (id) => ipcRenderer.invoke('session:getMetrics', id),
    onTick: (callback) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('session:tick', handler);
      return () => ipcRenderer.removeListener('session:tick', handler);
    },
    onEnd: (callback) => {
      const handler = (_event: any, sessionId: string) => callback(sessionId);
      ipcRenderer.on('session:end', handler);
      return () => ipcRenderer.removeListener('session:end', handler);
    },
  },
  insights: {
    generate: (sessionId) => ipcRenderer.invoke('insights:generate', sessionId),
  },
  recap: {
    getMonthly: (yearMonth) => ipcRenderer.invoke('recap:getMonthly', yearMonth),
    generate: (yearMonth) => ipcRenderer.invoke('recap:generate', yearMonth),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
};

contextBridge.exposeInMainWorld('attensa', api);
