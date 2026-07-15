import type { HttpContext } from '@adonisjs/core/http'
import AccountModel from '#models/account'
import AnalyzedEmailModel from '#models/analyzed_email'
import { MailProviderFactory } from '#services/mail/mail_factory'
import type { AccountShape } from '#types/settings'
import type { MailConnectionConfig, MailProviderType } from '#services/mail/mail_types'

function toShape(model: AccountModel): AccountShape {
  return {
    id: String(model.id),
    type: model.type as MailProviderType,
    config: model.getConfig() as MailConnectionConfig,
    name: model.name ?? undefined,
    status: model.status as AccountShape['status'],
  }
}

export default class AccountsController {
  async index({ auth }: HttpContext) {
    const models = await AccountModel.query().where('user_id', auth.user!.id)
    return models.map(toShape)
  }

  async store({ auth, request, response }: HttpContext) {
    const type = request.input('type')
    const name = request.input('name')
    const config = request.input('config')
    const status = (request.input('status') as string) || 'working'

    if (!type || !config) {
      return response.badRequest({ message: 'type and config are required' })
    }

    const account = new AccountModel()
    account.userId = auth.user!.id
    account.type = type
    account.name = name
    account.status = status
    account.setConfig(config)
    await account.save()

    return toShape(account)
  }

  async update({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const account = await AccountModel.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!account) return response.notFound({ message: 'Account not found' })

    if (request.input('name') !== undefined) account.name = request.input('name')
    if (request.input('status') !== undefined) account.status = request.input('status')
    if (request.input('config') !== undefined) account.setConfig(request.input('config'))

    await account.save()
    return toShape(account)
  }

  async destroy({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const account = await AccountModel.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!account) return response.notFound({ message: 'Account not found' })

    await AnalyzedEmailModel.query().where('user_id', auth.user!.id).where('account_id', String(id)).delete()
    await account.delete()
    return { success: true }
  }

  async testConnection({ request, response }: HttpContext) {
    const type = request.input('type')
    const config = request.input('config')
    if (!type || !config) return response.badRequest({ message: 'type and config are required' })

    try {
      const provider = MailProviderFactory.createProvider(type as MailProviderType)
      const result = await provider.testConnection(config)
      return result
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async listFolders({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const account = await AccountModel.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!account) return response.notFound({ message: 'Account not found' })

    try {
      const provider = MailProviderFactory.createProvider(account.type as MailProviderType)
      const folders = provider.getMailFolders ? await provider.getMailFolders(account.getConfig()) : []
      return folders
    } catch (error) {
      return response.badRequest({ message: error instanceof Error ? error.message : String(error) })
    }
  }

  // List folders from a connection config without requiring a saved account
  // (used by the setup wizard before the account is persisted).
  async listFoldersForConfig({ request, response }: HttpContext) {
    const type = request.input('type')
    const config = request.input('config')
    if (!type || !config) return response.badRequest({ message: 'type and config are required' })

    try {
      const provider = MailProviderFactory.createProvider(type as MailProviderType)
      const folders = provider.getMailFolders ? await provider.getMailFolders(config) : []
      return { success: true, folders }
    } catch (error) {
      return response.badRequest({ success: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
}
