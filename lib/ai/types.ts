export interface AIService {
  listModels(): Promise<string[]>
  sendMessage(message: string, model?: string): Promise<string>
  testConnection(): Promise<void>
}
