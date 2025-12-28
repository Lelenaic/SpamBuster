import { createAIService } from './factory'
import { AIService } from './types'
import { Rule } from '../types'

export interface SpamAnalysisResult {
  score: number // 0-10, where 0 = not spam, 10 = definitely spam
  reasoning?: string
}

export class SpamDetectorService {
  private aiService: AIService | null = null

  constructor(
    private aiSource: string,
    private config: { baseUrl?: string; apiKey?: string },
    private selectedModel?: string
  ) {}

  private async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      this.aiService = createAIService(this.aiSource, this.config)
    }
    return this.aiService
  }

  private buildPrompt(emailContent: string, rules: Rule[]): string {
    const basePrompt = `You are a spam email detection expert. Analyze the following email content and determine if it's spam.

Your task is to provide a spam score from 0 to 10, where:
- 0 = Definitely not spam (legitimate email)
- 5 = Unsure, could be either
- 10 = Definitely spam (100% sure it's spam)

Consider these spam indicators:
- Unsolicited commercial content
- Urgency or pressure tactics
- Poor grammar or suspicious formatting
- Suspicious links or attachments
- Generic greetings
- Requests for personal information
- Too good to be true offers
- Phishing attempts

Additional user-defined rules to consider:`

    const rulesText = rules.length > 0
      ? rules.map(rule => `- ${rule.text}`).join('\n')
      : 'No additional rules defined.'

    const emailSection = `\n\nEmail content to analyze:
---
${emailContent}
---

Respond ONLY with a valid JSON object in this exact format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<brief explanation of your decision>"
}

Do not include any other text or formatting.`

    return basePrompt + '\n' + rulesText + emailSection
  }

  async analyzeEmail(emailContent: string, rules: Rule[] = []): Promise<SpamAnalysisResult> {
    try {
      const aiService = await this.getAIService()
      const prompt = this.buildPrompt(emailContent, rules)

      const response = await aiService.sendMessage(prompt, this.selectedModel)

      // Parse the JSON response
      const result = JSON.parse(response.trim())

      // Validate the response structure
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 10) {
        throw new Error('Invalid spam score in AI response')
      }

      return {
        score: Math.round(result.score), // Ensure it's an integer
        reasoning: result.reasoning || 'No reasoning provided'
      }
    } catch (error) {
      console.error('Error analyzing email for spam:', error)
      // Return a neutral score if analysis fails
      return {
        score: 5,
        reasoning: 'Analysis failed, defaulting to neutral score'
      }
    }
  }
}
