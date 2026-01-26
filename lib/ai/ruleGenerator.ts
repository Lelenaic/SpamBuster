import { createAIService } from './factory';
import { AIService } from './types';

export interface RuleGenerationResult {
  ruleText: string;
}

export class RuleGeneratorService {
  private aiService: AIService | null = null;

  private async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      this.aiService = await createAIService();
    }
    return this.aiService;
  }

  async generateRuleText(description: string): Promise<string> {
    const aiService = await this.getAIService();
    const selectedModel = await window.aiAPI.getSelectedModel();

    const prompt = `You are a spam detection expert. Generate a concise, effective rule text that helps identify spam emails.

User's description of spam to detect:
${description}

Generate a rule text that:
- Is clear and specific
- Focuses on patterns, keywords, or behaviors that indicate spam
- Is written in a way that an AI can use to classify emails
- Is concise (1-3 sentences maximum)

Respond ONLY with a valid JSON object in this exact format:
{
  "ruleText": "<the generated rule text>"
}

Do not include any other text or formatting.`;

    // Retry logic: up to 3 attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await aiService.sendMessage(prompt, selectedModel);

        // Extract JSON from response using regex (handles AI models that add comments)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in AI response');
        }
        const result = JSON.parse(jsonMatch[0]) as RuleGenerationResult;

        // Validate the response structure
        if (typeof result.ruleText !== 'string' || !result.ruleText.trim()) {
          throw new Error('Invalid ruleText in AI response');
        }

        return result.ruleText.trim();
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
        // Continue to next attempt
      }
    }

    throw new Error('Unexpected error in generateRuleText retry logic');
  }
}

// Singleton instance
let ruleGeneratorService: RuleGeneratorService | null = null;

export function getRuleGeneratorService(): RuleGeneratorService {
  if (!ruleGeneratorService) {
    ruleGeneratorService = new RuleGeneratorService();
  }
  return ruleGeneratorService;
}
