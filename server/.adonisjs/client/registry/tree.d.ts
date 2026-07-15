/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  eventStream: typeof routes['event_stream']
  subscribe: typeof routes['subscribe']
  unsubscribe: typeof routes['unsubscribe']
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  accounts: {
    index: typeof routes['accounts.index']
    store: typeof routes['accounts.store']
    show: typeof routes['accounts.show']
    update: typeof routes['accounts.update']
    destroy: typeof routes['accounts.destroy']
    testConnection: typeof routes['accounts.test_connection']
    listFolders: typeof routes['accounts.list_folders']
    listFoldersForConfig: typeof routes['accounts.list_folders_for_config']
  }
  rules: {
    index: typeof routes['rules.index']
    store: typeof routes['rules.store']
    show: typeof routes['rules.show']
    update: typeof routes['rules.update']
    destroy: typeof routes['rules.destroy']
  }
  settings: {
    getGeneral: typeof routes['settings.get_general']
    putGeneral: typeof routes['settings.put_general']
    getAi: typeof routes['settings.get_ai']
    putAi: typeof routes['settings.put_ai']
    testAi: typeof routes['settings.test_ai']
    listAiModels: typeof routes['settings.list_ai_models']
    listEmbeddingModels: typeof routes['settings.list_embedding_models']
  }
  analyzedEmails: {
    index: typeof routes['analyzed_emails.index']
    update: typeof routes['analyzed_emails.update']
    destroy: typeof routes['analyzed_emails.destroy']
  }
  vectorDb: {
    count: typeof routes['vector_db.count']
    search: typeof routes['vector_db.search']
    clear: typeof routes['vector_db.clear']
  }
  alerts: {
    index: typeof routes['alerts.index']
  }
  process: {
    start: typeof routes['process.start']
    stop: typeof routes['process.stop']
  }
  community: {
    getRules: typeof routes['community.get_rules']
    searchRules: typeof routes['community.search_rules']
    getCuratedModels: typeof routes['community.get_curated_models']
    login: typeof routes['community.login']
  }
  oAuth: {
    googleStart: typeof routes['o_auth.google_start']
    microsoftDeviceCode: typeof routes['o_auth.microsoft_device_code']
    microsoftPoll: typeof routes['o_auth.microsoft_poll']
    googleCallback: typeof routes['o_auth.google_callback']
  }
}
