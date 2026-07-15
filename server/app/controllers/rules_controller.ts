import type { HttpContext } from '@adonisjs/core/http'
import RuleModel from '#models/rule'
import type { Rule } from '#types'

function toRule(model: RuleModel): Rule {
  let accounts: string[] | null = null
  if (model.emailAccounts) {
    try {
      accounts = JSON.parse(model.emailAccounts)
    } catch {
      accounts = null
    }
  }
  return {
    id: String(model.id),
    name: model.name,
    text: model.text,
    enabled: model.enabled,
    emailAccounts: accounts,
  }
}

export default class RulesController {
  async index({ auth }: HttpContext) {
    const models = await RuleModel.query().where('user_id', auth.user!.id)
    return models.map(toRule)
  }

  async store({ auth, request, response }: HttpContext) {
    const name = request.input('name')
    const text = request.input('text')
    const enabled = request.input('enabled', true)
    const emailAccounts = request.input('emailAccounts')

    if (!name || !text) return response.badRequest({ message: 'name and text are required' })

    const rule = new RuleModel()
    rule.userId = auth.user!.id
    rule.name = name
    rule.text = text
    rule.enabled = enabled
    rule.emailAccounts = emailAccounts ? JSON.stringify(emailAccounts) : null
    await rule.save()

    return toRule(rule)
  }

  async update({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const rule = await RuleModel.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!rule) return response.notFound({ message: 'Rule not found' })

    if (request.input('name') !== undefined) rule.name = request.input('name')
    if (request.input('text') !== undefined) rule.text = request.input('text')
    if (request.input('enabled') !== undefined) rule.enabled = request.input('enabled')
    if (request.input('emailAccounts') !== undefined) {
      const accounts = request.input('emailAccounts')
      rule.emailAccounts = accounts ? JSON.stringify(accounts) : null
    }

    await rule.save()
    return toRule(rule)
  }

  async destroy({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const rule = await RuleModel.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!rule) return response.notFound({ message: 'Rule not found' })

    await rule.delete()
    return { success: true }
  }
}
