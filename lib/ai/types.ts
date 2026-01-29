export interface AIService {
  listModels(): Promise<string[]>
  listEmbeddingModels(): Promise<string[]>
  sendMessage(message: string, model?: string, temperature?: number, top_p?: number): Promise<{ content: string; cost: number }>
  generateEmbedding(text: string, model?: string): Promise<number[]>
  testConnection(): Promise<boolean>
  isConfigured(): boolean
}
