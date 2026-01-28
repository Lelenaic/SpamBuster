import { AIService } from './types'

export class OpenRouterService implements AIService {
  constructor(private apiKey: string, private baseUrl: string = 'https://openrouter.ai/api/v1') {}

  static getProviderName(): string {
    return "OpenRouter (Cloud)";
  }

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

  async sendMessage(message: string, model?: string, temperature?: number, top_p?: number): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: message }]
    }
    
    // Add temperature and top_p if provided (low temperature = more focused responses)
    if (temperature !== undefined) {
      body.temperature = temperature
    }
    if (top_p !== undefined) {
      body.top_p = top_p
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/key`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      
      if (!response.ok) {
        throw new Error('Service unreachable');
      }
      
      return true;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Invalid API key' || error.message === 'Service unreachable')) {
        throw error;
      }
      throw new Error('Service unreachable');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}
