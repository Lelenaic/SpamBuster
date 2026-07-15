import { api } from '../bridge'

export type OpenRouterModelInfo = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
};

export interface AIService {
  analyzeEmail(body: string, subject: string, sender: string, guidelines?: string): Promise<unknown>;
  getModels(): Promise<OpenRouterModelInfo[]>;
  isConfigured(): Promise<boolean>;
  testConnection(): Promise<void>;
  listModels(): Promise<string[]>;
  listModelsWithPricing?(): Promise<OpenRouterModelInfo[]>;
}

// Web shim: AI calls are routed to the backend. This factory exists so v1
// component imports resolve; the returned service proxies the backend.
export async function createAIService(): Promise<AIService> {
  return {
    analyzeEmail: async () => ({ score: 0, reasoning: '', isSpam: false }),
    getModels: async () => [],
    isConfigured: async () => {
      try {
        const s = (await api<any>('/settings/ai')) as any;
        return s.aiSource === 'ollama' ? true : !!s.hasApiKey;
      } catch {
        return false;
      }
    },
    testConnection: async () => {
      const r = (await api<any>('/settings/ai/test', { method: 'POST' })) as any;
      if (!r.success) throw new Error(r.error || 'Connection failed');
    },
    listModels: async () => {
      const r = (await api<any>('/settings/ai/models')) as any;
      return (r.models || []) as string[];
    },
    listModelsWithPricing: async () => {
      const r = (await api<any>('/settings/ai/models')) as any;
      return (r.pricing || []) as OpenRouterModelInfo[];
    },
  };
}
