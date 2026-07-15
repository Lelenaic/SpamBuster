/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'event_stream': {
    methods: ["GET","HEAD"]
    pattern: '/__transmit/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'subscribe': {
    methods: ["POST"]
    pattern: '/__transmit/subscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'unsubscribe': {
    methods: ["POST"]
    pattern: '/__transmit/unsubscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.store': {
    methods: ["POST"]
    pattern: '/api/v1/accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/accounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/accounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/accounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.test_connection': {
    methods: ["POST"]
    pattern: '/api/v1/accounts/test'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.list_folders': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/accounts/:id/folders'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'accounts.list_folders_for_config': {
    methods: ["POST"]
    pattern: '/api/v1/accounts/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'rules.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'rules.store': {
    methods: ["POST"]
    pattern: '/api/v1/rules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'rules.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'rules.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'rules.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.get_general': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings/general'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.put_general': {
    methods: ["PUT"]
    pattern: '/api/v1/settings/general'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.get_ai': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings/ai'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.put_ai': {
    methods: ["PUT"]
    pattern: '/api/v1/settings/ai'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.test_ai': {
    methods: ["POST"]
    pattern: '/api/v1/settings/ai/test'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.list_ai_models': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings/ai/models'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.list_embedding_models': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings/ai/embedding-models'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'analyzed_emails.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/analyzed-emails'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'analyzed_emails.update': {
    methods: ["PUT"]
    pattern: '/api/v1/analyzed-emails/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'analyzed_emails.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/analyzed-emails/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'vector_db.count': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vector-db/count'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'vector_db.search': {
    methods: ["POST"]
    pattern: '/api/v1/vector-db/search'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'vector_db.clear': {
    methods: ["DELETE"]
    pattern: '/api/v1/vector-db/clear'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'alerts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/alerts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'process.start': {
    methods: ["POST"]
    pattern: '/api/v1/process'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'process.stop': {
    methods: ["POST"]
    pattern: '/api/v1/process/stop'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'community.get_rules': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/community/rules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'community.search_rules': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/community/rules/search/:q'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { q: ParamValue }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'community.get_curated_models': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/community/curated-models'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'community.login': {
    methods: ["POST"]
    pattern: '/api/v1/community/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'o_auth.google_start': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/oauth/google/start'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'o_auth.microsoft_device_code': {
    methods: ["POST"]
    pattern: '/api/v1/oauth/microsoft/device-code'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'o_auth.microsoft_poll': {
    methods: ["POST"]
    pattern: '/api/v1/oauth/microsoft/poll'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'o_auth.google_callback': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/oauth/google/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
}
