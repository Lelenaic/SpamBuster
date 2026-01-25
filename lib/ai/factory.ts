import { AIService } from './types'
import { OllamaService } from './ollama'
import { OpenRouterService } from './openrouter'

export async function createAIService(): Promise<AIService> {
  if (typeof window === 'undefined' || !window.aiAPI) {
    throw new Error('AI API not available')
  }

  const aiSource = await window.aiAPI.getAISource()
  
  switch (aiSource) {
    case 'ollama':
      const ollamaBaseUrl = await window.aiAPI.getOllamaBaseUrl()
      return new OllamaService(ollamaBaseUrl || 'http://localhost:11434')
    case 'openrouter':
      const openRouterApiKey = await window.aiAPI.getOpenRouterApiKey()
      if (!openRouterApiKey) throw new Error('API key required for OpenRouter')
      return new OpenRouterService(openRouterApiKey)
    default:
      throw new Error(`Unknown AI source: ${aiSource}`)
  }
}
