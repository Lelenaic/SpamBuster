import { AIService } from './types'

export class OpenRouterService implements AIService {
  constructor(private apiKey: string, private baseUrl: string = 'https://openrouter.ai/api/v1') {}

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) throw new Error('Failed to fetch models')
    const data = await response.json()
    return data.data.map((m: { id: string }) => m.id)
  }

  async sendMessage(message: string, model?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }]
      })
    })
    if (!response.ok) throw new Error('Failed to send message')
    const data = await response.json()
    return data.choices[0].message.content
  }

  async testConnection(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/key`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) throw new Error('Failed to connect to OpenRouter')
  }
}
