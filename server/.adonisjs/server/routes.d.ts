import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.test_connection': { paramsTuple?: []; params?: {} }
    'accounts.list_folders': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.list_folders_for_config': { paramsTuple?: []; params?: {} }
    'rules.index': { paramsTuple?: []; params?: {} }
    'rules.store': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.get_general': { paramsTuple?: []; params?: {} }
    'settings.put_general': { paramsTuple?: []; params?: {} }
    'settings.get_ai': { paramsTuple?: []; params?: {} }
    'settings.put_ai': { paramsTuple?: []; params?: {} }
    'settings.test_ai': { paramsTuple?: []; params?: {} }
    'settings.list_ai_models': { paramsTuple?: []; params?: {} }
    'settings.list_embedding_models': { paramsTuple?: []; params?: {} }
    'analyzed_emails.index': { paramsTuple?: []; params?: {} }
    'analyzed_emails.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'analyzed_emails.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vector_db.count': { paramsTuple?: []; params?: {} }
    'vector_db.search': { paramsTuple?: []; params?: {} }
    'vector_db.clear': { paramsTuple?: []; params?: {} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'process.start': { paramsTuple?: []; params?: {} }
    'process.stop': { paramsTuple?: []; params?: {} }
    'community.get_rules': { paramsTuple?: []; params?: {} }
    'community.search_rules': { paramsTuple: [ParamValue]; params: {'q': ParamValue} }
    'community.get_curated_models': { paramsTuple?: []; params?: {} }
    'community.login': { paramsTuple?: []; params?: {} }
    'o_auth.google_start': { paramsTuple?: []; params?: {} }
    'o_auth.microsoft_device_code': { paramsTuple?: []; params?: {} }
    'o_auth.microsoft_poll': { paramsTuple?: []; params?: {} }
    'o_auth.google_callback': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.list_folders': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.index': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.get_general': { paramsTuple?: []; params?: {} }
    'settings.get_ai': { paramsTuple?: []; params?: {} }
    'settings.list_ai_models': { paramsTuple?: []; params?: {} }
    'settings.list_embedding_models': { paramsTuple?: []; params?: {} }
    'analyzed_emails.index': { paramsTuple?: []; params?: {} }
    'vector_db.count': { paramsTuple?: []; params?: {} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'community.get_rules': { paramsTuple?: []; params?: {} }
    'community.search_rules': { paramsTuple: [ParamValue]; params: {'q': ParamValue} }
    'community.get_curated_models': { paramsTuple?: []; params?: {} }
    'o_auth.google_start': { paramsTuple?: []; params?: {} }
    'o_auth.google_callback': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.list_folders': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.index': { paramsTuple?: []; params?: {} }
    'rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.get_general': { paramsTuple?: []; params?: {} }
    'settings.get_ai': { paramsTuple?: []; params?: {} }
    'settings.list_ai_models': { paramsTuple?: []; params?: {} }
    'settings.list_embedding_models': { paramsTuple?: []; params?: {} }
    'analyzed_emails.index': { paramsTuple?: []; params?: {} }
    'vector_db.count': { paramsTuple?: []; params?: {} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'community.get_rules': { paramsTuple?: []; params?: {} }
    'community.search_rules': { paramsTuple: [ParamValue]; params: {'q': ParamValue} }
    'community.get_curated_models': { paramsTuple?: []; params?: {} }
    'o_auth.google_start': { paramsTuple?: []; params?: {} }
    'o_auth.google_callback': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.test_connection': { paramsTuple?: []; params?: {} }
    'accounts.list_folders_for_config': { paramsTuple?: []; params?: {} }
    'rules.store': { paramsTuple?: []; params?: {} }
    'settings.test_ai': { paramsTuple?: []; params?: {} }
    'vector_db.search': { paramsTuple?: []; params?: {} }
    'process.start': { paramsTuple?: []; params?: {} }
    'process.stop': { paramsTuple?: []; params?: {} }
    'community.login': { paramsTuple?: []; params?: {} }
    'o_auth.microsoft_device_code': { paramsTuple?: []; params?: {} }
    'o_auth.microsoft_poll': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.put_general': { paramsTuple?: []; params?: {} }
    'settings.put_ai': { paramsTuple?: []; params?: {} }
    'analyzed_emails.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'accounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'analyzed_emails.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vector_db.clear': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}