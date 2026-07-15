import type { HttpContext } from '@adonisjs/core/http'
import GeneralSetting from '#models/general_setting'
import AiSetting from '#models/ai_setting'
import { DEFAULT_GENERAL_SETTINGS, DEFAULT_AI_SETTINGS, type GeneralSettings, type AiSettings } from '#types/settings'
import { createAIService } from '#services/ai/ai_factory'
import type { OpenRouterModelInfo } from '#services/ai/openrouter_service'

function generalToObject(model: GeneralSetting): GeneralSettings {
  return {
    aiSensitivity: model.aiSensitivity,
    emailAgeDays: model.emailAgeDays,
    simplifyEmailContent: model.simplifyEmailContent,
    simplifyEmailContentMode: model.simplifyEmailContentMode,
    enableCron: model.enableCron,
    cronExpression: model.cronExpression,
    schedulerMode: model.schedulerMode,
    schedulerSimpleValue: model.schedulerSimpleValue,
    schedulerSimpleUnit: model.schedulerSimpleUnit,
    dateFormat: model.dateFormat,
    customDateFormat: model.customDateFormat,
    timeFormat: model.timeFormat as '12h' | '24h',
  }
}

function aiToObject(model: AiSetting): AiSettings & { hasApiKey: boolean } {
  const apiKey = model.getOpenRouterApiKey()
  return {
    aiSource: model.aiSource as 'ollama' | 'openrouter',
    ollamaBaseUrl: model.ollamaBaseUrl,
    openRouterApiKey: '',
    selectedModel: model.selectedModel,
    selectedEmbedModel: model.selectedEmbedModel,
    enableVectorDB: model.enableVectorDb,
    customizeSpamGuidelines: model.customizeSpamGuidelines,
    customSpamGuidelines: model.customSpamGuidelines,
    temperature: model.temperature,
    topP: model.topP,
    hasApiKey: !!apiKey,
  }
}

export default class SettingsController {
  // ----- General -----
  async getGeneral({ auth, request }: HttpContext) {
    let model = await GeneralSetting.query().where('user_id', auth.user!.id).first()
    if (!model) model = await GeneralSetting.create({ userId: auth.user!.id })
    const full = generalToObject(model)

    // Optional field selection: ?only=dateFormat,customDateFormat
    const only = request.input('only')
    if (typeof only === 'string' && only.trim() !== '') {
      const requested = only
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f in full) as (keyof GeneralSettings)[]
      if (requested.length > 0) {
        const partial: Partial<GeneralSettings> = {}
        for (const field of requested) {
          ;(partial as Record<string, unknown>)[field] = full[field]
        }
        return partial
      }
    }

    return full
  }

  async putGeneral({ auth, request }: HttpContext) {
    let model = await GeneralSetting.query().where('user_id', auth.user!.id).first()
    if (!model) model = await GeneralSetting.create({ userId: auth.user!.id })

    const fields = Object.keys(DEFAULT_GENERAL_SETTINGS) as (keyof GeneralSettings)[]
    for (const field of fields) {
      const value = request.input(field)
      if (value !== undefined && value !== null) {
        ;(model as unknown as Record<string, unknown>)[field] = value
      }
    }
    await model.save()
    return generalToObject(model)
  }

  // ----- AI -----
  async getAi({ auth }: HttpContext) {
    let model = await AiSetting.query().where('user_id', auth.user!.id).first()
    if (!model) model = await AiSetting.create({ userId: auth.user!.id })
    return aiToObject(model)
  }

  async putAi({ auth, request }: HttpContext) {
    let model = await AiSetting.query().where('user_id', auth.user!.id).first()
    if (!model) model = await AiSetting.create({ userId: auth.user!.id })

    const fields = Object.keys(DEFAULT_AI_SETTINGS) as (keyof AiSettings)[]
    for (const field of fields) {
      if (field === 'openRouterApiKey') continue
      const value = request.input(field)
      if (value !== undefined && value !== null) {
        ;(model as unknown as Record<string, unknown>)[field] = value
      }
    }

    const apiKey = request.input('openRouterApiKey')
    if (apiKey !== undefined && apiKey !== null && apiKey !== '') {
      model.setOpenRouterApiKey(apiKey)
    }

    await model.save()
    return aiToObject(model)
  }

  async testAi({ auth, response }: HttpContext) {
    const settings = await this.loadAiSettings(auth)
    try {
      const service = await createAIService(settings)
      const ok = await service.testConnection()
      return { success: ok }
    } catch (error) {
      return response.badRequest({ success: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  async listAiModels({ auth }: HttpContext) {
    const settings = await this.loadAiSettings(auth)
    try {
      const service = await createAIService(settings)
      const models = await service.listModels()
      const pricing: OpenRouterModelInfo[] =
        'listModelsWithPricing' in service ? await (service as any).listModelsWithPricing() : []
      return { models, pricing }
    } catch (error) {
      return { models: [], pricing: [], error: error instanceof Error ? error.message : String(error) }
    }
  }

  async listEmbeddingModels({ auth, request }: HttpContext) {
    const baseUrl = request.input('baseUrl') || (await this.loadAiSettings(auth)).ollamaBaseUrl || 'http://localhost:11434'
    try {
      const { OllamaService } = await import('#services/ai/ollama_service')
      const service = new OllamaService(baseUrl)
      const models = await service.listEmbeddingModels()
      return { models }
    } catch (error) {
      return { models: [], error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async loadAiSettings(auth: HttpContext['auth']): Promise<AiSettings> {
    let model = await AiSetting.query().where('user_id', auth.user!.id).first()
    if (!model) model = await AiSetting.create({ userId: auth.user!.id })
    return {
      aiSource: model.aiSource as 'ollama' | 'openrouter',
      ollamaBaseUrl: model.ollamaBaseUrl,
      openRouterApiKey: model.getOpenRouterApiKey() ?? '',
      selectedModel: model.selectedModel,
      selectedEmbedModel: model.selectedEmbedModel,
      enableVectorDB: model.enableVectorDb,
      customizeSpamGuidelines: model.customizeSpamGuidelines,
      customSpamGuidelines: model.customSpamGuidelines,
      temperature: model.temperature,
      topP: model.topP,
    }
  }
}
