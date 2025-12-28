declare global {
  interface Window {
    electronAPI: {
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      send: (channel: string, args?: unknown) => void;
      invoke: (channel: string, args?: unknown) => Promise<unknown>;
    };
    packageAPI: {
      getInfo: () => Promise<{
        currentVersion: string;
        repository: string;
        name: string;
        error?: string;
      }>;
    };
    storeAPI: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    rulesAPI: {
      getAll: () => Promise<unknown[]>;
      getById: (id: string) => Promise<unknown>;
      create: (ruleData: unknown) => Promise<unknown>;
      update: (id: string, updates: unknown) => Promise<unknown>;
      delete: (id: string) => Promise<void>;
    };
    accountsAPI: {
      getAll: () => Promise<unknown[]>;
      getById: (id: string) => Promise<unknown>;
      create: (accountData: unknown) => Promise<unknown>;
      update: (id: string, updates: unknown) => Promise<unknown>;
      delete: (id: string) => Promise<void>;
    };
    aiAPI: {
      getAISource: () => Promise<string>;
      setAISource: (value: string) => Promise<void>;
      getOllamaBaseUrl: () => Promise<string>;
      setOllamaBaseUrl: (value: string) => Promise<void>;
      getOllamaApiKey: () => Promise<string>;
      setOllamaApiKey: (value: string) => Promise<void>;
      getOpenRouterApiKey: () => Promise<string>;
      setOpenRouterApiKey: (value: string) => Promise<void>;
      getSelectedModel: () => Promise<string>;
      setSelectedModel: (value: string) => Promise<void>;
      getSelectedEmbedModel: () => Promise<string>;
      setSelectedEmbedModel: (value: string) => Promise<void>;
      getAISensitivity: () => Promise<number>;
      setAISensitivity: (value: number) => Promise<void>;
      getEmailAgeDays: () => Promise<number>;
      setEmailAgeDays: (value: number) => Promise<void>;
    };
    shellAPI: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}

export {};
