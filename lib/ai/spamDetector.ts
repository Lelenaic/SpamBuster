import { createAIService } from './factory'
import { AIService } from './types'
import { Rule } from '../types'
import { EmailData } from '../mail/types'
import TurndownService from 'turndown'

export const DEFAULT_SPAM_GUIDELINES = `SPAM SCORE GUIDELINES:
- 0-2 = Definitely not spam (legitimate email)
- 3-4 = Probably not spam (minor concerns)
- 5-6 = Unsure, could be either
- 7-8 = Probably spam (matches user rules OR multiple strong indicators)
- 9-10 = Definitely spam (matches user rules OR 100% fraud/phishing)

DEFAULT SPAM INDICATORS (only apply when NO user rules match):
- Unsolicited commercial promotions or ads
- High urgency/scarcity tactics (e.g., "act now or lose!")
- Poor grammar, all caps, excessive punctuation (!!!)
- Suspicious/masked links or attachments
- Generic greetings (e.g., "Dear User")
- Requests for personal/financial info
- Unrealistic offers (free money, prizes)
- Phishing (fake login pages, urgent account issues)

HAM SIGNALS (only apply when NO user rules match):
- Personalized greetings or references
- Legitimate business/receipt confirmations
- Expected from known contacts
- Normal grammar and professional tone
- No suspicious links/attachments

ADDITIONAL GUIDELINES FOR DEFAULT BEHAVIOR:
- When in doubt and no rules match, classify as legitimate (ham)
- Single weak indicators alone should not raise spam score above 3/10
- Large brands sending legitimate communications are not spam UNLESS user rules say otherwise
- Encoding issues alone are not a reason to mark as spam
- Urgency combined with suspicious links/requests = high spam score

EXAMPLES:

Example 1 - User Rule Match:
Email: Professional newsletter from "Zoho France <newsletter@zoho.com>" with unsubscribe link
User Rule: "I don't want any newsletters, they're all spam"
Score: 9/10 (spam)
Reasoning: User explicitly defined newsletters as spam. This rule overrides the fact that it's from a legitimate company with proper formatting.

Example 2 - No Rules, Legitimate:
Email: "Hi John, meeting rescheduled to Friday due to my family emergency. Best, Sarah."
User Rules: None match
Score: 0/10 (ham)
Reasoning: Personalized greeting, legitimate request, no spam indicators present.

Example 3 - No Rules, Clear Spam:
Email: "URGENT! Your account expires! Click here NOW to verify: bit.ly/fake!!!"
User Rules: None match
Score: 9/10 (spam)
Reasoning: Generic urgency, suspicious shortened link, all caps, pressure tactics.`

export interface SpamAnalysisResult {
  score: number // 0-10, where 0 = not spam, 10 = definitely spam
  reasoning?: string
}

export class SpamDetectorService {
  private turndownService: TurndownService

  constructor() {
    this.turndownService = new TurndownService()
  }

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

  private async getSimplifyEmailContent(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      return false
    }
    return await window.aiAPI.getSimplifyEmailContent()
  }

  private async buildPrompt(email: EmailData, rules: Rule[], shouldSimplify: boolean, similarEmails: Array<{
    id: string;
    emailId: string;
    subject: string;
    sender: string;
    body: string;
    score: number;
    reasoning: string;
    accountId: string;
    isSpam: boolean;
    analyzedAt: string;
    userValidated?: boolean | null;
    similarity: number;
  }> = [], customizeSpamGuidelines: boolean = false, customSpamGuidelines: string = ''): Promise<string> {
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

    // Simplify email content if enabled
    const simplifiedBody = shouldSimplify ? this.turndownService.turndown(email.body) : email.body

    const basePromptStart = `You are a spam email detection expert. Analyze the following email content and determine if it's spam.

    ═══════════════════════════════════════════════════════════════════════════════════
    🚨 CRITICAL: USER-DEFINED RULES ARE ABSOLUTE LAW 🚨
    ═══════════════════════════════════════════════════════════════════════════════════
    
    MANDATORY RULE HIERARCHY:
    
    1. **USER-DEFINED RULES OVERRIDE EVERYTHING** - If a user rule matches the email, that rule determines the classification. Period. No exceptions.
       - If a rule says "newsletters are spam", then ALL newsletters are spam with score 8-10/10
       - If a rule says "emails from domain X are spam", then they are spam with score 8-10/10
       - If a rule says "emails containing keyword Y are spam", then they are spam with score 8-10/10
       - It does NOT matter if the email is from a legitimate company
       - It does NOT matter if the email has proper unsubscribe links
       - It does NOT matter if the email is professionally formatted
       - USER RULES = ABSOLUTE TRUTH
    
    2. **DEFAULT BEHAVIOR (only when NO user rules match):**
       Only if no user-defined rules apply to this email, then analyze it using standard spam detection criteria below.
    
    ═══════════════════════════════════════════════════════════════════════════════════
    `

    const basePromptMiddle = customizeSpamGuidelines
      ? customSpamGuidelines
      : DEFAULT_SPAM_GUIDELINES

    const basePromptEnd = `
    ═══════════════════════════════════════════════════════════════════════════════════
    USER-DEFINED RULES (check FIRST, these override everything):`

    const rulesText = rules.length > 0
      ? rules.map(rule => `- ${rule.text}`).join('\n')
      : 'No additional rules defined.'

    const similarEmailsText = similarEmails.length > 0
      ? `\n\nFor additional context, here are some similar emails that were previously analyzed, less important than the user-defined rules:\n\n${similarEmails.map((similar, index) => {

        // Determine if user confirmed or corrected the AI's classification
        let userValidationNote = '';
        
        if (similar.userValidated !== undefined && similar.userValidated !== null) {
          const aiClassification = similar.isSpam ? 'spam' : 'legitimate';
          const userClassification = similar.userValidated ? 'spam' : 'legitimate';
          
          if (similar.isSpam === similar.userValidated) {
            // User confirmed the AI's classification
            userValidationNote = ` (User CONFIRMED: AI classified as ${aiClassification}, user agreed with this classification. The AI score is VALID and can be trusted.)`;
          } else {
            // User corrected the AI's classification
            userValidationNote = ` (User CORRECTED: AI classified as ${aiClassification}, but user marked it as ${userClassification}. The AI score is INVALID and should be considered incorrect.)`;
          }
        } else {
          userValidationNote = ' (No user validation: Only AI classified this email)';
        }

        return `Similar Email ${index + 1}:
Subject: ${similar.subject}
Sender: ${similar.sender}
Spam Score: ${similar.score}/10
Classification: ${similar.isSpam ? 'Spam' : 'Legitimate'}${userValidationNote}
Reasoning: ${similar.reasoning}`;
      }).join('\n---\n\n')}`
      : ''

    const emailSection = `\n\nEmail details:
Sender Name: ${senderName}
Sender Email: ${senderEmail}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

Email content to analyze:
---
${simplifiedBody}
---

Respond ONLY with a valid JSON object in this exact format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<brief explanation of your decision>"
}

Do not include any other text or formatting.`

    return basePromptStart + basePromptMiddle + basePromptEnd + '\n' + rulesText + similarEmailsText + emailSection
  }

  async analyzeEmail(email: EmailData, rules: Rule[] = []): Promise<SpamAnalysisResult> {
    const aiService = await this.getAIService()
    const simplifyEmailContent = await this.getSimplifyEmailContent()

    // Get custom spam guidelines if enabled
    let customizeSpamGuidelines = false
    let customSpamGuidelines = ''
    if (typeof window !== 'undefined' && window.aiAPI) {
      customizeSpamGuidelines = await window.aiAPI.getCustomizeSpamGuidelines()
      if (customizeSpamGuidelines) {
        customSpamGuidelines = await window.aiAPI.getCustomSpamGuidelines()
      }
    }

    // Get similar emails for context (if VectorDB is enabled)
    let similarEmails: Array<{
      id: string;
      emailId: string;
      subject: string;
      sender: string;
      body: string;
      score: number;
      reasoning: string;
      accountId: string;
      isSpam: boolean;
      analyzedAt: string;
      userValidated?: boolean | null;
      similarity: number;
    }> = []
    if (typeof window !== 'undefined' && window.aiAPI && window.vectorDBAPI) {
      try {
        const enableVectorDB = await window.aiAPI.getEnableVectorDB();
        if (enableVectorDB) {
          const queryText = `${email.subject} ${email.body || ''}`.substring(0, 1000) // Limit query length
          similarEmails = await window.vectorDBAPI.findSimilarEmails(queryText, 3) // Get top 3 similar emails
        }
      } catch (error) {
        console.error('Failed to get similar emails:', error)
      }
    }

    const prompt = await this.buildPrompt(email, rules, simplifyEmailContent, similarEmails, customizeSpamGuidelines, customSpamGuidelines)

    const selectedModel = await this.getSelectedModel()
    
    // Retry logic: up to 3 attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
        if (attempt === 3) {
          // After 3 attempts, re-throw the error to skip the email
          throw error
        }
        // Continue to next attempt
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in analyzeEmail retry logic')
  }
}
