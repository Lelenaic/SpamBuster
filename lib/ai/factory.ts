import { AIService } from './types'
import { OllamaService } from './ollama'
import { OpenRouterService } from './openrouter'

export function createAIService(source: string, config: { baseUrl?: string; apiKey?: string }): AIService {
  switch (source) {
    case 'ollama':
      return new OllamaService(config.baseUrl || 'http://localhost:11434', config.apiKey)
    case 'openrouter':
      if (!config.apiKey) throw new Error('API key required for OpenRouter')
      return new OpenRouterService(config.apiKey, config.baseUrl)
    default:
      throw new Error(`Unknown AI source: ${source}`)
  }
}
