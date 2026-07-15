import type {
  accountsAPI,
  rulesAPI,
  analyzedEmailsAPI,
  generalAPI,
  aiAPI,
  vectorDBAPI,
  oauthAPI,
  processingEvents,
  communityAPI,
  authAPI,
  alertsAPI,
  processAPI,
} from '@/lib/bridge';

declare global {
  interface Window {
    accountsAPI: typeof accountsAPI;
    rulesAPI: typeof rulesAPI;
    analyzedEmailsAPI: typeof analyzedEmailsAPI;
    generalAPI: typeof generalAPI;
    aiAPI: typeof aiAPI;
    vectorDBAPI: typeof vectorDBAPI;
    oauthAPI: typeof oauthAPI;
    processingEvents: typeof processingEvents;
    communityAPI: typeof communityAPI;
    authAPI: typeof authAPI;
    alertsAPI: typeof alertsAPI;
    processAPI: typeof processAPI;
  }
}

export {};
