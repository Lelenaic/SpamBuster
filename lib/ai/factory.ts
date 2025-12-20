import { AIService } from './types'
import { OllamaService } from './ollama'

export function createAIService(source: string, config: { baseUrl?: string; apiKey?: string }): AIService {
  switch (source) {
    case 'ollama':
      return new OllamaService(config.baseUrl || 'http://localhost:11434', config.apiKey)
    default:
      throw new Error(`Unknown AI source: ${source}`)
  }
}
