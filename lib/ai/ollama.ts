import { AIService } from './types'

export class OllamaService implements AIService {
  constructor(private baseUrl: string, private apiKey?: string) {}

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) throw new Error('Failed to fetch models')
    const data = await response.json()
    return data.models.map((m: { name: string }) => m.name)
  }

  async sendMessage(message: string, model?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: message, stream: false })
    })
    if (!response.ok) throw new Error('Failed to send message')
    const data = await response.json()
    return data.response
  }
}
