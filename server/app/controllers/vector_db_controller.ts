import type { HttpContext } from '@adonisjs/core/http'
import AiSetting from '#models/ai_setting'
import { getLanceDbService } from '#services/vector/lance_db'

export default class VectorDbController {
  private async getService(ctx: HttpContext) {
    const ai = await AiSetting.query().where('user_id', ctx.auth.user!.id).first()
    if (!ai || !ai.enableVectorDb) return null
    return getLanceDbService(String(ctx.auth.user!.id), ai.ollamaBaseUrl, () => ai.selectedEmbedModel)
  }

  async count({ auth }: HttpContext) {
    const service = await this.getService({ auth } as HttpContext)
    if (!service) return { count: 0 }
    try {
      return { count: await service.getEmailCount() }
    } catch {
      return { count: 0 }
    }
  }

  async search({ auth, request, response }: HttpContext) {
    const queryText = request.input('queryText')
    const accountId = request.input('accountId')
    const limit = Number(request.input('limit', 5))
    if (!queryText) return response.badRequest({ message: 'queryText is required' })

    const service = await this.getService({ auth } as HttpContext)
    if (!service) return response.badRequest({ message: 'Vector DB is not enabled' })

    return await service.findSimilarEmails(queryText, limit, accountId)
  }

  async clear({ auth, response }: HttpContext) {
    const service = await this.getService({ auth } as HttpContext)
    if (!service) return response.badRequest({ message: 'Vector DB is not enabled' })
    await service.clearAllEmails()
    return { success: true }
  }
}
