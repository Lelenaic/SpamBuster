import { createAIService } from './factory'
import { AIService } from './types'
import { Rule } from '../types'
import { EmailData } from '../mail/types'

export interface SpamAnalysisResult {
  score: number // 0-10, where 0 = not spam, 10 = definitely spam
  reasoning?: string
}

export class SpamDetectorService {
  constructor() {}

  private async getAIService(): Promise<AIService> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      throw new Error('AI API not available')
    }

    return await createAIService()
  }

  private async getSelectedModel(): Promise<string> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      return ''
    }
    return await window.aiAPI.getSelectedModel()
  }

  private buildPrompt(email: EmailData, rules: Rule[]): string {
    // Parse sender name and email from the 'from' field
    const nameEmailMatch = email.from.match(/^([^<]+)<([^>]+)>$/)
    let senderName: string
    let senderEmail: string
    
    if (nameEmailMatch) {
      senderName = nameEmailMatch[1].trim()
      senderEmail = nameEmailMatch[2].trim()
    } else {
      // Assume it's just an email address
      senderName = 'Unknown'
      senderEmail = email.from
    }

    const basePrompt = `You are a spam email detection expert. Analyze the following email content and determine if it's spam.
    Only classify as spam if the main intent is unwanted commercial promotion, fraud, or phishing. Messages that are informal, have typos, or mention typical spam topics are not spam if they look like normal human conversation.
    When in doubt, classify as legitimate (ham). Avoid calling a message spam unless there are multiple strong indicators.
    Single weak indicators like minor grammar mistakes or a generic greeting alone should not raise the spam score above 3/10.

    Your task is to provide a spam score from 0 to 10, where:
    - 0 = Definitely not spam (legitimate email)
    - 5 = Unsure, could be either
    - 10 = Definitely spam (100% sure it's spam)

    Spam indicators (check ALL, but weigh context):
    - Unsolicited commercial promotions or ads
    - High urgency/scarcity tactics (e.g., "act now or lose!")
    - Poor grammar, all caps, excessive punctuation (!!!)
    - Suspicious/masked links or attachments
    - Generic greetings (e.g., "Dear User")
    - Requests for personal/financial info
    - Unrealistic offers (free money, prizes)
    - Phishing (fake login pages, urgent account issues)

    ALSO consider ham signals:
    - Personalized greetings or references
    - Legitimate business/receipt confirmations
    - Expected from known contacts
    - Normal grammar and professional tone
    - No suspicious links/attachments

    Urgency alone is not enough; combine urgency with suspicious links or sensitive data requests to consider high spam.

    Large brands (e.g., banks, SaaS tools) sending password-reset or invoice emails are often legitimate; only score high if the email requests credentials on an external/non-brand domain.

    If the email contains realistic order numbers, invoice IDs, and consistent branding, treat it as more likely legitimate unless links look deceptive.

    Take into account that encoding issues can happend, this must not be a sole reason to consider an email as spam.

    Examples:

    Email 1: "Hi John, meeting rescheduled to Friday due to my family emergency. Best, Sarah."
    Reasoning: Personalized greeting, legitimate request, no indicators present.
    Score: 0 (ham)

    Email 2: "URGENT! Your account expires! Click here NOW to verify: bit.ly/fake!!!"
    Reasoning: Generic urgency, suspicious shortened link, all caps, pressure tactics.
    Score: 9 (spam)

    Additional user-defined rules to consider:`

    const rulesText = rules.length > 0
      ? rules.map(rule => `- ${rule.text}`).join('\n')
      : 'No additional rules defined.'

    const emailSection = `\n\nEmail details:
Sender Name: ${senderName}
Sender Email: ${senderEmail}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

Email content to analyze:
---
${email.body}
---

Respond ONLY with a valid JSON object in this exact format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<brief explanation of your decision>"
}

Do not include any other text or formatting.`

    return basePrompt + '\n' + rulesText + emailSection
  }

  async analyzeEmail(email: EmailData, rules: Rule[] = []): Promise<SpamAnalysisResult> {
    try {
      const aiService = await this.getAIService()
      const prompt = this.buildPrompt(email, rules)

      const selectedModel = await this.getSelectedModel()
      const response = await aiService.sendMessage(prompt, selectedModel)

      // Extract JSON from response using regex (handles AI models that add comments)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response')
      }
      const result = JSON.parse(jsonMatch[0])

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
