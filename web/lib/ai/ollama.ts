import { api } from '../bridge'

// Web shim: Ollama runs server-side (the backend uses it for embeddings and
// optional inference). These methods proxy the backend so v1 settings imports
// resolve and the UI reflects backend state.
export class OllamaService {
  constructor(private baseUrl: string = 'http://localhost:11434') {}

  async testConnection(): Promise<void> {
    const r = (await api<any>('/settings/ai/test', { method: 'POST' })) as any
    if (!r.success) throw new Error(r.error || 'Connection failed')
  }

  async listEmbeddingModels(): Promise<string[]> {
    const r = (await api<any>(`/settings/ai/embedding-models?baseUrl=${encodeURIComponent(this.baseUrl)}`)) as any
    return (r.models || []) as string[]
  }

  async listModels(): Promise<string[]> {
    const r = (await api<any>('/settings/ai/models')) as any
    return (r.models || []) as string[]
  }

  getModels(): Promise<string[]> {
    return this.listModels()
  }

  isConfigured(): boolean {
    return !!this.baseUrl
  }
}
