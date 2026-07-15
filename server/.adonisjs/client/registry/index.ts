/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'event_stream': {
    methods: ["GET","HEAD"],
    pattern: '/__transmit/events',
    tokens: [{"old":"/__transmit/events","type":0,"val":"__transmit","end":""},{"old":"/__transmit/events","type":0,"val":"events","end":""}],
    types: placeholder as Registry['event_stream']['types'],
  },
  'subscribe': {
    methods: ["POST"],
    pattern: '/__transmit/subscribe',
    tokens: [{"old":"/__transmit/subscribe","type":0,"val":"__transmit","end":""},{"old":"/__transmit/subscribe","type":0,"val":"subscribe","end":""}],
    types: placeholder as Registry['subscribe']['types'],
  },
  'unsubscribe': {
    methods: ["POST"],
    pattern: '/__transmit/unsubscribe',
    tokens: [{"old":"/__transmit/unsubscribe","type":0,"val":"__transmit","end":""},{"old":"/__transmit/unsubscribe","type":0,"val":"unsubscribe","end":""}],
    types: placeholder as Registry['unsubscribe']['types'],
  },
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'accounts.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/accounts',
    tokens: [{"old":"/api/v1/accounts","type":0,"val":"api","end":""},{"old":"/api/v1/accounts","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['accounts.index']['types'],
  },
  'accounts.store': {
    methods: ["POST"],
    pattern: '/api/v1/accounts',
    tokens: [{"old":"/api/v1/accounts","type":0,"val":"api","end":""},{"old":"/api/v1/accounts","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['accounts.store']['types'],
  },
  'accounts.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/accounts/:id',
    tokens: [{"old":"/api/v1/accounts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['accounts.show']['types'],
  },
  'accounts.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/accounts/:id',
    tokens: [{"old":"/api/v1/accounts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['accounts.update']['types'],
  },
  'accounts.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/accounts/:id',
    tokens: [{"old":"/api/v1/accounts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/:id","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['accounts.destroy']['types'],
  },
  'accounts.test_connection': {
    methods: ["POST"],
    pattern: '/api/v1/accounts/test',
    tokens: [{"old":"/api/v1/accounts/test","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/test","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/test","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/test","type":0,"val":"test","end":""}],
    types: placeholder as Registry['accounts.test_connection']['types'],
  },
  'accounts.list_folders': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/accounts/:id/folders',
    tokens: [{"old":"/api/v1/accounts/:id/folders","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/:id/folders","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/:id/folders","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/:id/folders","type":1,"val":"id","end":""},{"old":"/api/v1/accounts/:id/folders","type":0,"val":"folders","end":""}],
    types: placeholder as Registry['accounts.list_folders']['types'],
  },
  'accounts.list_folders_for_config': {
    methods: ["POST"],
    pattern: '/api/v1/accounts/folders',
    tokens: [{"old":"/api/v1/accounts/folders","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/folders","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/folders","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/folders","type":0,"val":"folders","end":""}],
    types: placeholder as Registry['accounts.list_folders_for_config']['types'],
  },
  'rules.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/rules',
    tokens: [{"old":"/api/v1/rules","type":0,"val":"api","end":""},{"old":"/api/v1/rules","type":0,"val":"v1","end":""},{"old":"/api/v1/rules","type":0,"val":"rules","end":""}],
    types: placeholder as Registry['rules.index']['types'],
  },
  'rules.store': {
    methods: ["POST"],
    pattern: '/api/v1/rules',
    tokens: [{"old":"/api/v1/rules","type":0,"val":"api","end":""},{"old":"/api/v1/rules","type":0,"val":"v1","end":""},{"old":"/api/v1/rules","type":0,"val":"rules","end":""}],
    types: placeholder as Registry['rules.store']['types'],
  },
  'rules.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/rules/:id',
    tokens: [{"old":"/api/v1/rules/:id","type":0,"val":"api","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"rules","end":""},{"old":"/api/v1/rules/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['rules.show']['types'],
  },
  'rules.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/rules/:id',
    tokens: [{"old":"/api/v1/rules/:id","type":0,"val":"api","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"rules","end":""},{"old":"/api/v1/rules/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['rules.update']['types'],
  },
  'rules.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/rules/:id',
    tokens: [{"old":"/api/v1/rules/:id","type":0,"val":"api","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/rules/:id","type":0,"val":"rules","end":""},{"old":"/api/v1/rules/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['rules.destroy']['types'],
  },
  'settings.get_general': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/settings/general',
    tokens: [{"old":"/api/v1/settings/general","type":0,"val":"api","end":""},{"old":"/api/v1/settings/general","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/general","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/general","type":0,"val":"general","end":""}],
    types: placeholder as Registry['settings.get_general']['types'],
  },
  'settings.put_general': {
    methods: ["PUT"],
    pattern: '/api/v1/settings/general',
    tokens: [{"old":"/api/v1/settings/general","type":0,"val":"api","end":""},{"old":"/api/v1/settings/general","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/general","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/general","type":0,"val":"general","end":""}],
    types: placeholder as Registry['settings.put_general']['types'],
  },
  'settings.get_ai': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/settings/ai',
    tokens: [{"old":"/api/v1/settings/ai","type":0,"val":"api","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"ai","end":""}],
    types: placeholder as Registry['settings.get_ai']['types'],
  },
  'settings.put_ai': {
    methods: ["PUT"],
    pattern: '/api/v1/settings/ai',
    tokens: [{"old":"/api/v1/settings/ai","type":0,"val":"api","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/ai","type":0,"val":"ai","end":""}],
    types: placeholder as Registry['settings.put_ai']['types'],
  },
  'settings.test_ai': {
    methods: ["POST"],
    pattern: '/api/v1/settings/ai/test',
    tokens: [{"old":"/api/v1/settings/ai/test","type":0,"val":"api","end":""},{"old":"/api/v1/settings/ai/test","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/ai/test","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/ai/test","type":0,"val":"ai","end":""},{"old":"/api/v1/settings/ai/test","type":0,"val":"test","end":""}],
    types: placeholder as Registry['settings.test_ai']['types'],
  },
  'settings.list_ai_models': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/settings/ai/models',
    tokens: [{"old":"/api/v1/settings/ai/models","type":0,"val":"api","end":""},{"old":"/api/v1/settings/ai/models","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/ai/models","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/ai/models","type":0,"val":"ai","end":""},{"old":"/api/v1/settings/ai/models","type":0,"val":"models","end":""}],
    types: placeholder as Registry['settings.list_ai_models']['types'],
  },
  'settings.list_embedding_models': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/settings/ai/embedding-models',
    tokens: [{"old":"/api/v1/settings/ai/embedding-models","type":0,"val":"api","end":""},{"old":"/api/v1/settings/ai/embedding-models","type":0,"val":"v1","end":""},{"old":"/api/v1/settings/ai/embedding-models","type":0,"val":"settings","end":""},{"old":"/api/v1/settings/ai/embedding-models","type":0,"val":"ai","end":""},{"old":"/api/v1/settings/ai/embedding-models","type":0,"val":"embedding-models","end":""}],
    types: placeholder as Registry['settings.list_embedding_models']['types'],
  },
  'analyzed_emails.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/analyzed-emails',
    tokens: [{"old":"/api/v1/analyzed-emails","type":0,"val":"api","end":""},{"old":"/api/v1/analyzed-emails","type":0,"val":"v1","end":""},{"old":"/api/v1/analyzed-emails","type":0,"val":"analyzed-emails","end":""}],
    types: placeholder as Registry['analyzed_emails.index']['types'],
  },
  'analyzed_emails.update': {
    methods: ["PUT"],
    pattern: '/api/v1/analyzed-emails/:id',
    tokens: [{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"api","end":""},{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"analyzed-emails","end":""},{"old":"/api/v1/analyzed-emails/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['analyzed_emails.update']['types'],
  },
  'analyzed_emails.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/analyzed-emails/:id',
    tokens: [{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"api","end":""},{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/analyzed-emails/:id","type":0,"val":"analyzed-emails","end":""},{"old":"/api/v1/analyzed-emails/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['analyzed_emails.destroy']['types'],
  },
  'vector_db.count': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/vector-db/count',
    tokens: [{"old":"/api/v1/vector-db/count","type":0,"val":"api","end":""},{"old":"/api/v1/vector-db/count","type":0,"val":"v1","end":""},{"old":"/api/v1/vector-db/count","type":0,"val":"vector-db","end":""},{"old":"/api/v1/vector-db/count","type":0,"val":"count","end":""}],
    types: placeholder as Registry['vector_db.count']['types'],
  },
  'vector_db.search': {
    methods: ["POST"],
    pattern: '/api/v1/vector-db/search',
    tokens: [{"old":"/api/v1/vector-db/search","type":0,"val":"api","end":""},{"old":"/api/v1/vector-db/search","type":0,"val":"v1","end":""},{"old":"/api/v1/vector-db/search","type":0,"val":"vector-db","end":""},{"old":"/api/v1/vector-db/search","type":0,"val":"search","end":""}],
    types: placeholder as Registry['vector_db.search']['types'],
  },
  'vector_db.clear': {
    methods: ["DELETE"],
    pattern: '/api/v1/vector-db/clear',
    tokens: [{"old":"/api/v1/vector-db/clear","type":0,"val":"api","end":""},{"old":"/api/v1/vector-db/clear","type":0,"val":"v1","end":""},{"old":"/api/v1/vector-db/clear","type":0,"val":"vector-db","end":""},{"old":"/api/v1/vector-db/clear","type":0,"val":"clear","end":""}],
    types: placeholder as Registry['vector_db.clear']['types'],
  },
  'alerts.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/alerts',
    tokens: [{"old":"/api/v1/alerts","type":0,"val":"api","end":""},{"old":"/api/v1/alerts","type":0,"val":"v1","end":""},{"old":"/api/v1/alerts","type":0,"val":"alerts","end":""}],
    types: placeholder as Registry['alerts.index']['types'],
  },
  'process.start': {
    methods: ["POST"],
    pattern: '/api/v1/process',
    tokens: [{"old":"/api/v1/process","type":0,"val":"api","end":""},{"old":"/api/v1/process","type":0,"val":"v1","end":""},{"old":"/api/v1/process","type":0,"val":"process","end":""}],
    types: placeholder as Registry['process.start']['types'],
  },
  'process.stop': {
    methods: ["POST"],
    pattern: '/api/v1/process/stop',
    tokens: [{"old":"/api/v1/process/stop","type":0,"val":"api","end":""},{"old":"/api/v1/process/stop","type":0,"val":"v1","end":""},{"old":"/api/v1/process/stop","type":0,"val":"process","end":""},{"old":"/api/v1/process/stop","type":0,"val":"stop","end":""}],
    types: placeholder as Registry['process.stop']['types'],
  },
  'community.get_rules': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/community/rules',
    tokens: [{"old":"/api/v1/community/rules","type":0,"val":"api","end":""},{"old":"/api/v1/community/rules","type":0,"val":"v1","end":""},{"old":"/api/v1/community/rules","type":0,"val":"community","end":""},{"old":"/api/v1/community/rules","type":0,"val":"rules","end":""}],
    types: placeholder as Registry['community.get_rules']['types'],
  },
  'community.search_rules': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/community/rules/search/:q',
    tokens: [{"old":"/api/v1/community/rules/search/:q","type":0,"val":"api","end":""},{"old":"/api/v1/community/rules/search/:q","type":0,"val":"v1","end":""},{"old":"/api/v1/community/rules/search/:q","type":0,"val":"community","end":""},{"old":"/api/v1/community/rules/search/:q","type":0,"val":"rules","end":""},{"old":"/api/v1/community/rules/search/:q","type":0,"val":"search","end":""},{"old":"/api/v1/community/rules/search/:q","type":1,"val":"q","end":""}],
    types: placeholder as Registry['community.search_rules']['types'],
  },
  'community.get_curated_models': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/community/curated-models',
    tokens: [{"old":"/api/v1/community/curated-models","type":0,"val":"api","end":""},{"old":"/api/v1/community/curated-models","type":0,"val":"v1","end":""},{"old":"/api/v1/community/curated-models","type":0,"val":"community","end":""},{"old":"/api/v1/community/curated-models","type":0,"val":"curated-models","end":""}],
    types: placeholder as Registry['community.get_curated_models']['types'],
  },
  'community.login': {
    methods: ["POST"],
    pattern: '/api/v1/community/login',
    tokens: [{"old":"/api/v1/community/login","type":0,"val":"api","end":""},{"old":"/api/v1/community/login","type":0,"val":"v1","end":""},{"old":"/api/v1/community/login","type":0,"val":"community","end":""},{"old":"/api/v1/community/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['community.login']['types'],
  },
  'o_auth.google_start': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/oauth/google/start',
    tokens: [{"old":"/api/v1/oauth/google/start","type":0,"val":"api","end":""},{"old":"/api/v1/oauth/google/start","type":0,"val":"v1","end":""},{"old":"/api/v1/oauth/google/start","type":0,"val":"oauth","end":""},{"old":"/api/v1/oauth/google/start","type":0,"val":"google","end":""},{"old":"/api/v1/oauth/google/start","type":0,"val":"start","end":""}],
    types: placeholder as Registry['o_auth.google_start']['types'],
  },
  'o_auth.microsoft_device_code': {
    methods: ["POST"],
    pattern: '/api/v1/oauth/microsoft/device-code',
    tokens: [{"old":"/api/v1/oauth/microsoft/device-code","type":0,"val":"api","end":""},{"old":"/api/v1/oauth/microsoft/device-code","type":0,"val":"v1","end":""},{"old":"/api/v1/oauth/microsoft/device-code","type":0,"val":"oauth","end":""},{"old":"/api/v1/oauth/microsoft/device-code","type":0,"val":"microsoft","end":""},{"old":"/api/v1/oauth/microsoft/device-code","type":0,"val":"device-code","end":""}],
    types: placeholder as Registry['o_auth.microsoft_device_code']['types'],
  },
  'o_auth.microsoft_poll': {
    methods: ["POST"],
    pattern: '/api/v1/oauth/microsoft/poll',
    tokens: [{"old":"/api/v1/oauth/microsoft/poll","type":0,"val":"api","end":""},{"old":"/api/v1/oauth/microsoft/poll","type":0,"val":"v1","end":""},{"old":"/api/v1/oauth/microsoft/poll","type":0,"val":"oauth","end":""},{"old":"/api/v1/oauth/microsoft/poll","type":0,"val":"microsoft","end":""},{"old":"/api/v1/oauth/microsoft/poll","type":0,"val":"poll","end":""}],
    types: placeholder as Registry['o_auth.microsoft_poll']['types'],
  },
  'o_auth.google_callback': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/oauth/google/callback',
    tokens: [{"old":"/api/v1/oauth/google/callback","type":0,"val":"api","end":""},{"old":"/api/v1/oauth/google/callback","type":0,"val":"v1","end":""},{"old":"/api/v1/oauth/google/callback","type":0,"val":"oauth","end":""},{"old":"/api/v1/oauth/google/callback","type":0,"val":"google","end":""},{"old":"/api/v1/oauth/google/callback","type":0,"val":"callback","end":""}],
    types: placeholder as Registry['o_auth.google_callback']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
