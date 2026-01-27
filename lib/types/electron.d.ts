import { Account, MailConnectionConfig } from '../mail/types';
import { Rule } from './types';

declare global {
  interface Window {
    electronAPI: {
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      send: (channel: string, ...args: unknown[]) => void
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
    packageAPI: {
      getInfo: () => Promise<{
        currentVersion: string;
        repository: string;
        name: string;
        error?: string;
      }>;
    };
    storeAPI: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
    }
    rulesAPI: {
      getAll: () => Promise<Rule[]>
      getById: (id: string) => Promise<Rule | undefined>
      create: (ruleData: Omit<Rule, "id">) => Promise<Rule>
      update: (id: string, updates: Partial<Omit<Rule, "id">>) => Promise<Rule | undefined>
      delete: (id: string) => Promise<boolean>
    }
    accountsAPI: {
      getAll: () => Promise<Account[]>
      getById: (id: string) => Promise<Account | undefined>
      create: (accountData: Omit<Account, "id">) => Promise<Account>
      update: (id: string, updates: Partial<Omit<Account, "id">>) => Promise<Account | undefined>
      delete: (id: string) => Promise<boolean>
      listMailboxFolders: (config: MailConnectionConfig) => Promise<{ success: boolean; folders?: { name: string; path: string }[]; error?: string }>
    }
    analyzedEmailsAPI: {
      getAll: () => Promise<unknown[]>
      getById: (id: string) => Promise<unknown>
      create: (emailData: unknown) => Promise<unknown>
      update: (id: string, updates: unknown) => Promise<unknown>
      delete: (id: string) => Promise<void>
    }
    aiAPI: {
      getAISource: () => Promise<string>
      setAISource: (value: string) => Promise<void>
      getOllamaBaseUrl: () => Promise<string>
      setOllamaBaseUrl: (value: string) => Promise<void>
      getOpenRouterApiKey: () => Promise<string>
      setOpenRouterApiKey: (value: string) => Promise<void>
      getSelectedModel: () => Promise<string>
      setSelectedModel: (value: string) => Promise<void>
      getSelectedEmbedModel: () => Promise<string>
      setSelectedEmbedModel: (value: string) => Promise<void>
      getAISensitivity: () => Promise<number>
      setAISensitivity: (value: number) => Promise<void>
      getEmailAgeDays: () => Promise<number>
      setEmailAgeDays: (value: number) => Promise<void>
      getSimplifyEmailContent: () => Promise<boolean>
      setSimplifyEmailContent: (value: boolean) => Promise<void>
      getSimplifyEmailContentMode: () => Promise<string>
      setSimplifyEmailContentMode: (value: string) => Promise<void>
      getEnableCron: () => Promise<boolean>
      setEnableCron: (value: boolean) => Promise<void>
      getCronExpression: () => Promise<string>
      setCronExpression: (value: string) => Promise<void>
      validateCronExpression: (expression: string) => Promise<{ valid: boolean; error?: string | Error }>
      getSchedulerMode: () => Promise<string>
      setSchedulerMode: (value: string) => Promise<void>
      getSchedulerSimpleValue: () => Promise<number>
      setSchedulerSimpleValue: (value: number) => Promise<void>
      getSchedulerSimpleUnit: () => Promise<string>
      setSchedulerSimpleUnit: (value: string) => Promise<void>
      generateCronFromSimple: (value: number, unit: string) => Promise<string>
      getEnableVectorDB: () => Promise<boolean>
      setEnableVectorDB: (value: boolean) => Promise<void>
      getCustomizeSpamGuidelines: () => Promise<boolean>
      setCustomizeSpamGuidelines: (value: boolean) => Promise<void>
      getCustomSpamGuidelines: () => Promise<string>
      setCustomSpamGuidelines: (value: string) => Promise<void>
    }
    vectorDBAPI: {
      findSimilarEmails: (queryText: string, limit?: number, accountId?: string) => Promise<Array<{
        id: string;
        emailId: string;
        subject: string;
        sender: string;
        body: string;
        score: number;
        reasoning: string;
        accountId: string;
        isSpam: boolean;
        analyzedAt: string;
        userValidated?: boolean | null;
        similarity: number;
      }>>;
      storeAnalyzedEmail: (emailData: {
        id: string;
        emailId: string;
        subject: string;
        sender: string;
        body: string;
        score: number;
        reasoning: string;
        accountId: string;
        isSpam: boolean;
      }) => Promise<void>;
      updateUserValidation: (emailId: string, userValidated: boolean | null) => Promise<void>;
      getEmailCount: () => Promise<number>;
      clearAllEmails: () => Promise<void>;
    }
    shellAPI: {
      openExternal: (url: string) => Promise<void>
    }
    oauthAPI: {
      getDeviceCode: (clientId: string, tenantId: string) => Promise<{
        success: boolean;
        user_code?: string;
        device_code?: string;
        verification_uri?: string;
        expires_in?: number;
        message?: string;
        error?: string;
      }>
      exchangeCode: (clientId: string, tenantId: string, deviceCode: string) => Promise<{
        success: boolean;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
      }>
      refreshToken: (clientId: string, tenantId: string, refreshToken: string) => Promise<{
        success: boolean;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
      }>
    }
    processingEvents: {
      onStatsUpdate: (callback: (data: {
        accountId: string;
        stats: {
          totalEmails: number;
          spamEmails: number;
          processedEmails: number;
          skippedEmails: number;
          errors: number;
        };
        overallStats: {
          totalEmails: number;
          spamEmails: number;
          processedEmails: number;
          skippedEmails: number;
          errors: number;
        };
      }) => void) => () => void;
      onProgress: (callback: (data: {
        totalEmails: number;
        processedEmails: number;
        progress: number;
        currentAccount?: string;
      }) => void) => () => void;
      onComplete: (callback: (data: {
        accountStats: Record<string, {
          totalEmails: number;
          spamEmails: number;
          processedEmails: number;
          skippedEmails: number;
          errors: number;
        }>;
        overallStats: {
          totalEmails: number;
          spamEmails: number;
          processedEmails: number;
          skippedEmails: number;
          errors: number;
        };
      }) => void) => () => void;
      onError: (callback: (error: Error) => void) => () => void;
      onStatusChange: (callback: (status: 'idle' | 'processing' | 'completed' | 'error') => void) => () => void;
      onAnalyzedEmailCreated: (callback: (email: {
        id: string;
        emailId: string;
        subject: string;
        sender: string;
        score: number;
        reasoning: string;
        analyzedAt: string;
        accountId: string;
        isSpam: boolean;
        manualOverride?: boolean;
        manualIsSpam?: boolean;
      }) => void) => () => void;
      removeAllListeners: (channel: string) => void;
    }
  }
}

export {};
