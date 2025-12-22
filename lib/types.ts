export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  user: string;
  context: string; // e.g., 'mail account', 'AI'
  message: string;
  goto?: string; // optional route or URL to fix the issue
}

declare global {
  interface Window {
    electronAPI: {
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      send: (channel: string, ...args: unknown[]) => void
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
    storeAPI: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

export {};
