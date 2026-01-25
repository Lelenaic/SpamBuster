import { AIService } from './types'

export class OllamaService implements AIService {
  constructor(private baseUrl: string) {}

  static getProviderName(): string {
    return 'Ollama (Local)';
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) throw new Error('Failed to fetch models')
    const data = await response.json()
    return data.models.map((m: { name: string }) => m.name)
  }

  async listEmbeddingModels(): Promise<string[]> {
    // For Ollama, embedding models are the same as regular models
    return this.listModels()
  }

  async sendMessage(message: string, model?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: message, stream: false, format: 'json' })
    })
    if (!response.ok) throw new Error('Failed to send message')
    const data = await response.json()
    return data.response
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      if (!response.ok) {
        throw new Error('Ollama service unreachable');
      }
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Ollama service unreachable') {
        throw error;
      }
      throw new Error('Ollama service unreachable');
    }
  }

  isConfigured(): boolean {
    return !!this.baseUrl && this.baseUrl.length > 0;
  }

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    if (!model) {
      throw new Error('Model required for embedding generation');
    }
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    const data = await response.json();
    return data.embedding;
  }
}
