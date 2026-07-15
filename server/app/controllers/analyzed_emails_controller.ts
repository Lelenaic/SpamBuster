import type { HttpContext } from '@adonisjs/core/http'
import AnalyzedEmail from '#models/analyzed_email'
import AiSetting from '#models/ai_setting'
import { getLanceDbService } from '#services/vector/lance_db'

function toObject(model: AnalyzedEmail) {
  return {
    id: String(model.id),
    accountId: model.accountId,
    emailId: model.emailId,
    subject: model.subject,
    sender: model.sender,
    score: model.score,
    reasoning: model.reasoning,
    isSpam: model.isSpam,
    analyzedAt: model.analyzedAt?.toISO() || null,
    userValidated: model.userValidated,
  }
}

export default class AnalyzedEmailsController {
  async index({ auth, request }: HttpContext) {
    const query = AnalyzedEmail.query().where('user_id', auth.user!.id).orderBy('analyzedAt', 'desc')

    const accountId = request.input('accountId')
    if (accountId) query.where('account_id', accountId)

    const isSpam = request.input('isSpam')
    if (isSpam !== undefined && isSpam !== null && isSpam !== '') {
      query.where('is_spam', isSpam === true || isSpam === 'true')
    }

    const userValidated = request.input('userValidated')
    if (userValidated !== undefined && userValidated !== null && userValidated !== '') {
      query.where('user_validated', Number(userValidated))
    }

    const limit = Number(request.input('limit', 200))
    const emails = await query.limit(Math.min(limit, 1000))
    return emails.map(toObject)
  }

  async update({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const email = await AnalyzedEmail.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!email) return response.notFound({ message: 'Analyzed email not found' })

    const userValidated = request.input('userValidated')
    if (userValidated !== undefined) {
      email.userValidated = Number(userValidated)
      if (userValidated == 1) email.isSpam = true
      else if (userValidated == 0) email.isSpam = false
    }
    if (request.input('isSpam') !== undefined) {
      email.isSpam = request.input('isSpam') === true || request.input('isSpam') === 'true'
    }

    await email.save()

    // Update vector DB user validation if enabled
    const ai = await AiSetting.query().where('user_id', auth.user!.id).first()
    if (ai && ai.enableVectorDb) {
      try {
        const vector = getLanceDbService(String(auth.user!.id), ai.ollamaBaseUrl, () => ai.selectedEmbedModel)
        const validated: boolean | null =
          email.userValidated === 1 ? true : email.userValidated === 0 ? false : null
        await vector.updateUserValidation(email.emailId, validated)
      } catch (error) {
        console.error('Failed to update vector user validation:', error)
      }
    }

    return toObject(email)
  }

  async destroy({ auth, request, response }: HttpContext) {
    const id = Number(request.param('id'))
    const email = await AnalyzedEmail.query().where('user_id', auth.user!.id).where('id', id).first()
    if (!email) return response.notFound({ message: 'Analyzed email not found' })

    await email.delete()
    return { success: true }
  }
}
