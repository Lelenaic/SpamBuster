/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import transmit from '@adonisjs/transmit/services/main'

import AccountsController from '#controllers/accounts_controller'
import RulesController from '#controllers/rules_controller'
import SettingsController from '#controllers/settings_controller'
import AnalyzedEmailsController from '#controllers/analyzed_emails_controller'
import VectorDbController from '#controllers/vector_db_controller'
import AlertsController from '#controllers/alerts_controller'
import ProcessController from '#controllers/process_controller'
import OAuthController from '#controllers/oauth_controller'
import CommunityController from '#controllers/community_controller'
import NewAccountController from '#controllers/new_account_controller'
import AccessTokensController from '#controllers/access_tokens_controller'
import ProfileController from '#controllers/profile_controller'
import { setSchedulerEmit, refreshAllUsers } from '#services/processing/scheduler_service'

// Register transmit HTTP routes (SSE transport endpoint), protected so the
// `authorize` callbacks can read `ctx.auth.user`.
transmit.registerRoutes((route) => route.use(middleware.auth()))

// Authorize subscriptions to a user's processing channel
transmit.authorize('users/:id/processing', (ctx, { id }) => {
  return ctx.auth.user?.id === Number(id)
})

transmit.authorize('users/:id/alerts', (ctx, { id }) => {
  return ctx.auth.user?.id === Number(id)
})

// Boot the scheduler once the app is ready
app.ready(async () => {
  setSchedulerEmit((userId, event, data) => {
    transmit.broadcast(`users/${userId}/processing`, { event, data } as any)
    transmit.broadcast(`users/${userId}/alerts`, { event, data } as any)
  })
  await refreshAllUsers()
})

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [NewAccountController, 'store'])
        router.post('login', [AccessTokensController, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [ProfileController, 'show'])
        router.post('logout', [AccessTokensController, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

router
  .group(() => {
    router.resource('accounts', AccountsController).apiOnly()
    router.post('accounts/test', [AccountsController, 'testConnection'])
    router.get('accounts/:id/folders', [AccountsController, 'listFolders'])
    router.post('accounts/folders', [AccountsController, 'listFoldersForConfig'])

    router.resource('rules', RulesController).apiOnly()

    router.get('settings/general', [SettingsController, 'getGeneral'])
    router.put('settings/general', [SettingsController, 'putGeneral'])
    router.get('settings/ai', [SettingsController, 'getAi'])
    router.put('settings/ai', [SettingsController, 'putAi'])
    router.post('settings/ai/test', [SettingsController, 'testAi'])
    router.get('settings/ai/models', [SettingsController, 'listAiModels'])
    router.get('settings/ai/embedding-models', [SettingsController, 'listEmbeddingModels'])

    router.get('analyzed-emails', [AnalyzedEmailsController, 'index'])
    router.put('analyzed-emails/:id', [AnalyzedEmailsController, 'update'])
    router.delete('analyzed-emails/:id', [AnalyzedEmailsController, 'destroy'])

    router.get('vector-db/count', [VectorDbController, 'count'])
    router.post('vector-db/search', [VectorDbController, 'search'])
    router.delete('vector-db/clear', [VectorDbController, 'clear'])

    router.get('alerts', [AlertsController, 'index'])

    router.post('process', [ProcessController, 'start'])
    router.post('process/stop', [ProcessController, 'stop'])

    router.get('community/rules', [CommunityController, 'getRules'])
    router.get('community/rules/search/:q', [CommunityController, 'searchRules'])
    router.get('community/curated-models', [CommunityController, 'getCuratedModels'])
    router.post('community/login', [CommunityController, 'login'])
  })
  .prefix('/api/v1')
  .use(middleware.auth())

// OAuth flows (used during account setup). The Google callback is hit by the
// provider (no session), so it stays unauthenticated; the initiation and
// Microsoft endpoints are authenticated so we can attribute the account.
router
  .group(() => {
    router.get('oauth/google/start', [OAuthController, 'googleStart'])
    router.post('oauth/microsoft/device-code', [OAuthController, 'microsoftDeviceCode'])
    router.post('oauth/microsoft/poll', [OAuthController, 'microsoftPoll'])
  })
  .prefix('/api/v1')
  .use(middleware.auth())

router.get('/oauth/google/callback', [OAuthController, 'googleCallback']).prefix('/api/v1')
