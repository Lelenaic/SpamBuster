import { Account } from './mail/types';

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  user: string;
  context: string; // e.g., 'mail account', 'AI'
  message: string;
  goto?: string; // optional route or URL to fix the issue
}

export interface Rule {
  id: string;
  name: string;
  text: string;
  enabled: boolean;
  emailAccounts: string[] | null; // null means apply to all accounts
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
    rulesAPI: {
      getAll: () => Promise<Rule[]>
      getById: (id: string) => Promise<Rule | undefined>
      create: (ruleData: Omit<Rule, 'id'>) => Promise<Rule>
      update: (id: string, updates: Partial<Omit<Rule, 'id'>>) => Promise<Rule | undefined>
      delete: (id: string) => Promise<boolean>
    }
    accountsAPI: {
      getAll: () => Promise<Account[]>
      getById: (id: string) => Promise<Account | undefined>
      create: (accountData: Omit<Account, 'id'>) => Promise<Account>
      update: (id: string, updates: Partial<Omit<Account, 'id'>>) => Promise<Account | undefined>
      delete: (id: string) => Promise<boolean>
    }
    aiAPI: {
      getAISource: () => Promise<string>
      setAISource: (value: string) => Promise<void>
      getOllamaBaseUrl: () => Promise<string>
      setOllamaBaseUrl: (value: string) => Promise<void>
      getOllamaApiKey: () => Promise<string>
      setOllamaApiKey: (value: string) => Promise<void>
      getOpenRouterApiKey: () => Promise<string>
      setOpenRouterApiKey: (value: string) => Promise<void>
      getSelectedModel: () => Promise<string>
      setSelectedModel: (value: string) => Promise<void>
      getSelectedEmbedModel: () => Promise<string>
      setSelectedEmbedModel: (value: string) => Promise<void>
    }
  }
}

export {};
