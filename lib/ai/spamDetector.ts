import { createAIService } from './factory'
import { AIService } from './types'
import { Rule } from '../types'
import { EmailData } from '../mail/types'
import TurndownService from 'turndown'

/**
 * Decode MIME quoted-printable encoded content
 */
function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=0A/g, '\n')
    .replace(/=0D/g, '\r')
    .replace(/=09/g, '\t')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
}

/**
 * Extract plain text from HTML by removing all tags and CSS
 */
function extractTextFromHTML(html: string): string {
  // Decode quoted-printable encoding first
  let decoded = decodeQuotedPrintable(html)
  
  // Split by multipart boundaries and take only the text content part
  const boundaryMatch = decoded.match(/--=_Part_[\d_]+/)
  if (boundaryMatch) {
    const parts = decoded.split(/--=_Part_[\d_]+/)
    let bestPart = decoded
    let bestScore = 0
    
    for (const part of parts) {
      // Skip very short parts or parts that are mostly CSS
      const cssPatterns = (part.match(/@[\w-]+\s*\{/g) || []).length
      const cssRuleBlocks = (part.match(/\{[^}]+\}/g) || []).length
      const textContent = part.replace(/<[^>]+>/g, '').replace(/@[\w-]+\s*\{[^}]+\}/g, '')
      const textLength = textContent.length
      
      // Score: prefer parts with more text and less CSS
      const score = textLength - (cssPatterns * 100) - (cssRuleBlocks * 50)
      
      if (score > bestScore && textLength > 100) {
        bestScore = score
        bestPart = part
      }
    }
    decoded = bestPart
  }
  
  // Remove everything after the main text content (often there's CSS appended)
  // Look for common footer patterns and cut off after them
  const footerMatch = decoded.match(/Amazon\.fr est le nom commercial d'Amazon/)
  if (footerMatch && footerMatch.index !== undefined) {
    decoded = decoded.substring(0, footerMatch.index + 200) + '...' // Keep a bit of footer
  }
  
  // Remove HTML comments
  decoded = decoded.replace(/<!--[^>]*-->/g, '')
  
  // Remove style elements and their content (case insensitive)
  decoded = decoded.replace(/<style[\s\S]*?<\/style>/gi, '')
  
  // Remove script elements and their content
  decoded = decoded.replace(/<script[\s\S]*?<\/script>/gi, '')
  
  // Remove noscript elements and their content
  decoded = decoded.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  
  // Remove iframe elements and their content
  decoded = decoded.replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  
  // Remove all remaining HTML tags
  decoded = decoded.replace(/<[^>]+>/g, '')
  
  // Remove @-rules and CSS blocks that appear outside tags
  decoded = decoded.replace(/@[\w-]+\s*\{[^}]+\}/g, '')
  
  // Remove any remaining CSS-like patterns with curly braces
  decoded = decoded.replace(/\{[^}]+\}/g, '')
  
  // Remove any remaining CSS selectors and properties
  decoded = decoded.replace(/[a-zA-Z-]+:\s*[^;]+;?/g, '')
  
  // Decode common HTML entities
  decoded = decoded
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  
  // Remove remaining HTML entities
  decoded = decoded.replace(/&[a-z]+;/gi, '')
  
  // Clean up: remove multiple spaces and newlines
  decoded = decoded.replace(/[ \t]+/g, ' ')
  decoded = decoded.replace(/\n{3,}/g, '\n\n')
  
  // Extract meaningful text lines
  const lines = decoded.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^[@:\{\}]/))
    
  return lines.join('\n').trim()
}

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

  private async getSimplifyEmailContentMode(): Promise<string> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      return 'aggressive'
    }
    return await window.aiAPI.getSimplifyEmailContentMode()
  }

  private createTurndownService(mode: string): TurndownService {
    const turndownService = new TurndownService()
    
    if (mode === 'aggressive') {
      // Remove all style/script elements and their content
      turndownService.addRule('removeStyleElements', {
        filter: ['style', 'script', 'noscript', 'iframe', 'head'],
        replacement: function () {
          return '' // Remove these elements entirely
        }
      })
      
      // Remove style attributes from all elements by extracting text content only
      turndownService.addRule('removeStyleAttributes', {
        filter: function (node) {
          // Apply to any element that has a style attribute
          return node.nodeType === 1 && node.hasAttribute && node.hasAttribute('style')
        },
        replacement: function (content, node, options) {
          // Return only the text content, stripping the style attribute entirely
          return turndownService.escape(node.textContent || '') + '\n\n'
        }
      })
      
      // Add fallback rule to escape all remaining HTML tags and extract text only
      turndownService.addRule('plainTextFallback', {
        filter: function (node) {
          return true // Apply to all nodes
        },
        replacement: function (content, node, options) {
          // For text nodes, return escaped content
          if (node.nodeType === 3) {
            return turndownService.escape(content)
          }
          // For elements, extract text content only (strips style attrs automatically)
          return turndownService.escape(node.textContent || '') + '\n\n'
        }
      })
    }
    
    return turndownService
  }

  private async buildPrompt(email: EmailData, rules: Rule[], shouldSimplify: boolean, simplifyMode: string, similarEmails: Array<{
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
    let simplifiedBody: string
    if (shouldSimplify) {
      if (simplifyMode === 'aggressive') {
        // Use regex-based extraction for aggressive mode
        simplifiedBody = extractTextFromHTML(email.body)
      } else {
        // Use turndown for simple mode
        const turndownService = this.createTurndownService(simplifyMode)
        simplifiedBody = turndownService.turndown(email.body)
      }
    } else {
      simplifiedBody = email.body
    }

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
    const simplifyEmailContentMode = await this.getSimplifyEmailContentMode()

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

    const prompt = await this.buildPrompt(email, rules, simplifyEmailContent, simplifyEmailContentMode, similarEmails, customizeSpamGuidelines, customSpamGuidelines)

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
