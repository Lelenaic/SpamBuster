import type { AIService } from '#services/ai/ai_types'
import type { AiSettings } from '#types/settings'
import { OllamaService } from '#services/ai/ollama_service'
import { OpenRouterService } from '#services/ai/openrouter_service'

export async function createAIService(settings: AiSettings): Promise<AIService> {
  const aiSource = settings.aiSource

  switch (aiSource) {
    case 'ollama':
      return new OllamaService(settings.ollamaBaseUrl || 'http://localhost:11434')
    case 'openrouter':
      if (!settings.openRouterApiKey) throw new Error('API key required for OpenRouter')
      return new OpenRouterService(settings.openRouterApiKey)
    default:
      throw new Error(`Unknown AI source: ${aiSource}`)
  }
}
