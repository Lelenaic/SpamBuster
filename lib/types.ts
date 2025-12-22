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
    storeAPI: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
    }
  }
}

export {};
