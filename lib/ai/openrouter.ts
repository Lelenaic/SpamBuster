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

  async listEmbeddingModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/embeddings/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) throw new Error('Failed to fetch embedding models')
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

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    if (!model) {
      throw new Error('Model required for embedding generation');
    }
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: text,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('OpenRouter API response:', JSON.stringify(data, null, 2));
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      console.error('Unexpected OpenRouter API response structure:', data);
      throw new Error('Invalid response structure from OpenRouter API');
    }
    return data.data[0].embedding;
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
