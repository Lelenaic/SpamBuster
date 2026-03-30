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
 * Check if a string looks like valid base64
 */
function isBase64(str: string): boolean {
  // Remove any whitespace first
  const cleanStr = str.replace(/\s+/g, '')
  
  // Base64 regex: A-Za-z0-9+/= with proper length (multiple of 4)
  if (cleanStr.length % 4 !== 0) return false
  
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(cleanStr)) return false
  
  // Check it has at least some typical base64 characters (not just padding)
  const base64Chars = cleanStr.replace(/=/g, '')
  if (base64Chars.length < 4) return false
  
  // Check it contains a mix of letters (both cases), numbers
  const hasUpper = /[A-Z]/.test(base64Chars)
  const hasLower = /[a-z]/.test(base64Chars)
  const hasNumber = /[0-9]/.test(base64Chars)
  
  return hasUpper && hasLower && hasNumber
}

/**
 * Decode base64 content if detected
 */
function decodeBase64IfNeeded(content: string): string {
  // Check if the entire content is base64
  if (isBase64(content)) {
    try {
      const decoded = Buffer.from(content, 'base64').toString('utf-8')
      // Only use decoded content if it produces readable text
      if (decoded && decoded.length > 0 && !decoded.includes('�')) {
        return decoded
      }
    } catch (e) {
      // Not valid base64, return original
    }
  }
  
  return content
}

/**
 * Find and decode all base64-encoded sections within the email body
 * This handles emails with multiple base64 parts (common in MIME multipart emails)
 */
function decodeAllBase64Sections(content: string): string {
  const lines = content.split('\n')
  const resultLines: string[] = []
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    // Check if this line is a boundary marker or header - keep these
    if (line.startsWith('--') || line.startsWith('Content-') || line.startsWith('boundary=') ||
        line.startsWith('creation-date=') || line.startsWith('modification-date=') || line === '') {
      resultLines.push(lines[i])
      i++
      continue
    }
    
    // Check if this line looks like base64
    if (isBase64(line) && line.length >= 20) {
      // This is a base64 line - try to decode it
      try {
        const decoded = Buffer.from(line, 'base64').toString('utf-8')
        
        // Check if decoded content is binary (image) or text
        const hasReplacementChars = decoded.includes('�')
        const hasMultipleNulls = (decoded.match(/\x00/g) || []).length > 0
        const hasLetters = /[a-zA-Z]/.test(decoded)
        
        // If it has letters and doesn't look like binary, it's text - use decoded
        if (hasLetters && !hasReplacementChars && !hasMultipleNulls) {
          resultLines.push(decoded)
        }
        // Otherwise it's binary (like images) - skip it entirely (don't add to result)
      } catch (e) {
        // Could not decode, skip this line
      }
      i++
    } else {
      // Regular content, pass through
      resultLines.push(lines[i])
      i++
    }
  }
  
  return resultLines.join('\n')
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

export const DEFAULT_SPAM_GUIDELINES = `SPAM & PHISHING SCORE GUIDELINES:
- 0-2 = Definitely not spam/phishing (legitimate email, absolutely certain)
- 3-4 = Probably not spam (minor concerns but mostly legitimate)
- 5-6 = Unsure, could be either (use this when uncertain!)
- 7-8 = Probably spam or phishing (confident but not 100% certain)
- 9-10 = Definitely spam or phishing (absolutely certain, no doubt)

⚠️ CRITICAL: Use the full 0-10 scale! If you're uncertain, use 5-6. Reserve 0-2 and 9-10 ONLY for cases where you are absolutely certain.

DEFAULT SPAM INDICATORS (only apply when NO user rules match AND phishing combination not triggered):
- Unsolicited commercial promotions or marketing emails
- High urgency/scarcity tactics (e.g., "act now or lose!")
- Poor grammar, all caps, excessive punctuation (!!!)
- Suspicious/masked links or attachments
- Generic greetings (e.g., "Dear User")
- Requests for personal/financial info
- Unrealistic offers (free money, prizes)

HAM SIGNALS (only apply when phishing combination NOT triggered AND no user rules match):
- Personalized greetings or references
- Transactional emails: receipts, order confirmations, shipping notifications, invoices
- Expected from known contacts
- Normal grammar and professional tone
- Sender display name matches the sender email domain
- URL shorteners present but from a known legitimate commercial brand with no other phishing signals

ADDITIONAL GUIDELINES FOR DEFAULT BEHAVIOR ONLY (do not apply if user rule matched):
- When in doubt and no rules match AND phishing combination not triggered, classify as legitimate (ham) with score 3-5
- Single weak indicators alone should not raise spam score above 3/10
- Transactional emails (receipts, confirmations, invoices) are NEVER spam by default unless explicitly matching a user rule OR phishing combination is triggered
- Large brands sending legitimate communications are not spam UNLESS user rules say otherwise OR phishing combination is triggered
- Encoding issues alone are not a reason to mark as spam
- Marketing newsletters from legitimate companies are spam-like (score 4-6) but not definitive spam unless user rules say so

EXAMPLES:

Example 1 - User Rule Match (Newsletter):
Email: Professional newsletter from "Zoho France <newsletter@zoho.com>" with unsubscribe link, containing product updates
User Rule: "I don't want any newsletters, they're all spam"
Phishing signals: None triggered
Score: 9/10 (spam)
Reasoning: Phishing check: no combination triggered. Rule check: this is a newsletter (periodic marketing content with unsubscribe link). User rule "I don't want any newsletters, they're all spam" matches. Priority 2 applies. Score: 9/10.

Example 2 - User Rule Does NOT Match (Transactional):
Email: Order confirmation from "Amazon <retour@amazon.fr>" with order details and return information
User Rule: "I don't want any newsletters, they're all spam"
Phishing signals: None triggered
Score: 0/10 (ham)
Reasoning: Phishing check: no combination triggered. Rule check: this is a transactional order confirmation, NOT a newsletter. User rule does not apply. Default behavior: legitimate transactional email. Score: 0/10.

Example 3 - User Rule Does NOT Match (Receipt):
Email: Payment receipt from "Stripe <invoice+statements@stripe.com>" for a completed transaction
User Rule: "I don't want any newsletters or marketing emails"
Phishing signals: None triggered
Score: 0/10 (ham)
Reasoning: Phishing check: no combination triggered. Rule check: this is a transactional receipt, NOT a newsletter or marketing email. User rule does not apply. Default behavior: legitimate receipt. Score: 0/10.

Example 4 - No Rules, Legitimate:
Email: "Hi John, meeting rescheduled to Friday due to my family emergency. Best, Sarah."
User Rules: None match
Phishing signals: None triggered
Score: 1/10 (ham)
Reasoning: Phishing check: no combination triggered. Rule check: no user rules match. Default behavior: personalized greeting, legitimate request, no spam indicators. Score: 1/10.

Example 5 - No Rules, Marketing but Uncertain:
Email: Professional promotional email from a known brand with unsubscribe link
User Rules: None or none that apply
Phishing signals: None triggered
Score: 5/10 (uncertain)
Reasoning: Phishing check: no combination triggered. Rule check: no user rules match. Default behavior: marketing content from legitimate company with proper unsubscribe. Score: 5/10.

Example 6 - User Rule Match (Promotional/Marketing):
Email: Promotional email from "Panda Security <newsletter@pandasecurity.com>" about new Dark Web monitoring feature
User Rule: "promotional, commercial, or marketing emails not related to an order I made = spam"
Phishing signals: None triggered (no P1, P2, P3, P4, P5 combination)
Score: 9/10 (spam)
Reasoning: Phishing check: no combination triggered. Rule check: this is a promotional/marketing email about a product feature, not related to any order. User rule "promotional, commercial, or marketing emails not related to an order I made = spam" matches. Priority 2 applies. Score: 9/10.

Example 7 - Phishing Overrides User Rule (Amazon impersonation):
Email: "URGENT! Your Amazon account expires! Click here NOW to verify your identity: bit.ly/fake"
Sender Name: "Amazon Security"
Sender Email: "security@amazon-verify-account.ru"
User Rule: "all emails from Amazon are ham"
Phishing signals: P1 present (claims Amazon but uses "amazon-verify-account.ru"), P3 present (account expiration threat), P4 present (identity verification demanded)
Score: 10/10 (phishing/spam)
Reasoning: Phishing check: P1 + P3 + P4 combination confirmed — this is phishing. Priority 1 applies: phishing OVERRIDES user rule. Even though user says "all emails from Amazon are ham", this is a confirmed phishing attempt. Score: 10/10.

Example 8 - User Rule Match (HAM):
Email: Promotional email from "Amazon <deals@amazon.fr>" about a sale
User Rule: "all emails from Amazon are ham"
Phishing signals: None triggered
Score: 1/10 (ham)
Reasoning: Phishing check: no combination triggered. Rule check: this email is from Amazon. User rule "all emails from Amazon are ham" matches and classifies as HAM. Priority 2 applies. Score: 1/10.

Example 8 - Phishing (Government Impersonation):
Sender Name: Antai.gouv.fr
Sender Email: contact@chamsswitch.com
Subject: AVIS DE RECOUVREMENT FORCÉ - RÉPONSE SOUS 24H
Body: Contains a call-to-action button linking to https://miniurl.com/abcd, threatens forced debt collection
User Rules: None match
Phishing signals: P1 + P2 + P3 + P4 all present
Score: 10/10 (phishing/spam)
Reasoning: Phishing check: P1 (impersonation), P2 (URL shortener in government context), P3 (forced collection threat), P4 (payment demand). Combination rule triggered. Priority 1 applies. Score: 10/10.

Example 9 - Phishing (Bank Impersonation):
Sender Name: Crédit Agricole Sécurité
Sender Email: securite@ca-verification-compte.net
Subject: Votre compte a été suspendu - Action requise
Body: "Veuillez vérifier votre identité immédiatement" with a link to a non-official domain
User Rules: None match
Phishing signals: P1 + P3 + P4 present
Score: 10/10 (phishing/spam)
Reasoning: Phishing check: P1 (claims Crédit Agricole but uses "ca-verification-compte.net"), P3 (account suspension threat), P4 (identity verification). Combination rule triggered. Priority 1 applies. Score: 10/10.

Example 10 - Transactional with URL Shortener (NOT phishing):
Sender Name: Amazon
Sender Email: shipment-tracking@amazon.fr
Subject: Your order has shipped
Body: Contains a short tracking link amzn.to/xxxx pointing to Amazon tracking page
User Rules: None match
Phishing signals: none triggered (P2 requires official/authority context, not commercial brands)
Score: 1/10 (ham)
Reasoning: Phishing check: P2 not triggered (commercial brand, not government/court/bank). No other signals. Rule check: no rules match. Default behavior: legitimate shipping notification. Score: 1/10.`

export interface SpamAnalysisResult {
  score: number // 0-10, where 0 = not spam, 10 = definitely spam
  reasoning?: string
  cost?: number // Cost in USD from the AI provider
  failedAttemptsCost?: number // Total cost of failed attempts
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
    if (typeof window === 'undefined' || !window.generalAPI) {
      return false
    }
    return await window.generalAPI.getSimplifyEmailContent()
  }

  private async getSimplifyEmailContentMode(): Promise<string> {
    if (typeof window === 'undefined' || !window.generalAPI) {
      return 'aggressive'
    }
    return await window.generalAPI.getSimplifyEmailContentMode()
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

  private buildSystemPrompt(rules: Rule[], similarEmails: Array<{
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
  }>, customizeSpamGuidelines: boolean, customSpamGuidelines: string): string {
    const systemStart = `You are a spam and phishing email detection expert. Your job is to analyze emails provided by the user and classify them.

═══════════════════════════════════════════════════════════════════════════════════
⚖️ DECISION PRIORITY HIERARCHY (follow this order strictly) ⚖️
═══════════════════════════════════════════════════════════════════════════════════

You must follow this exact priority order. Each level can only be overridden by a HIGHER level.

PRIORITY 1 (HIGHEST) — PHISHING COMBINATION:
If a phishing combination is confirmed → score 9-10. This OVERRIDES all user rules and all other considerations. Even if a user rule says "all emails from X are ham", a confirmed phishing email is ALWAYS spam.

PRIORITY 2 — USER RULES (spam OR ham):
If NO phishing combination is detected AND a user rule matches:
   - If the rule classifies the email as SPAM → score 8-10
   - If the rule classifies the email as HAM → score 0-2
User rules OVERRIDES all default behavior and legitimacy considerations. The user's explicit preference is the final answer.

PRIORITY 3 (LOWEST) — DEFAULT BEHAVIOR:
If NO phishing combination is detected AND NO user rule matches → apply the default spam detection guidelines below.

⚠️ ABSOLUTE RULE: You must NEVER contradict yourself. If you identify that a user rule matches, you MUST apply that rule's classification. You must NEVER say "this matches a user rule BUT it's from a legitimate brand so it's ok." That is a contradiction and is FORBIDDEN.

═══════════════════════════════════════════════════════════════════════════════════
🚨 STEP 1: PHISHING SIGNAL INVENTORY 🚨
═══════════════════════════════════════════════════════════════════════════════════

Collect which phishing signals are present. A SINGLE SIGNAL ALONE IS NOT ENOUGH — phishing requires a COMBINATION of at least 2 signals.

SIGNAL P1 — SENDER DOMAIN MISMATCH:
Is the "Sender Name" claiming to be a government agency, bank, court, or official institution, but the "Sender Email" domain does NOT belong to that organisation?
→ P1 present: "Antai.gouv.fr" from "contact@chamsswitch.com"; "PayPal" from "paypal@random-domain.xyz"
→ P1 absent: "Amazon" from "orders@amazon.fr"; "Stripe" from "receipts@stripe.com"

SIGNAL P2 — URL SHORTENER IN OFFICIAL/AUTHORITY CONTEXT:
Is a call-to-action or payment link using a known URL shortener (bit.ly, tinyurl.com, miniurl.com, rb.gy, ow.ly, goo.gl, shorte.st, cutt.ly, is.gd, tiny.cc, buff.ly, shorturl.at, bl.ink, t.co, clck.ru) AND the sender claims to be a government, court, law enforcement, or financial authority?
→ P2 present: government-impersonating email with a miniurl.com payment link
→ P2 absent: a regular e-commerce or newsletter email using a short link (Amazon amzn.to, etc.) — commercial brands using short links is normal and NOT P2

SIGNAL P3 — LEGAL/FINANCIAL URGENCY THREAT:
Does the subject or body contain threats of legal seizure, prosecution, forced debt collection, account suspension with financial loss, or demands for immediate action within a very short deadline?
→ P3 present: "RÉPONSE SOUS 24H", "saisie sur compte", "exécution forcée", "votre compte sera suspendu"
→ P3 absent: "limited time offer!", "sale ends today!" (commercial urgency is NOT P3)

SIGNAL P4 — SENSITIVE ACTION DEMANDED UNDER PRESSURE:
Does the email demand payment of a fine/debt, identity verification, login credentials, or personal/financial data combined with a threat or deadline?

SIGNAL P5 — LINK ANCHOR MISMATCH:
Does the visible text of a link show one domain but the actual href URL points to a completely different, unrelated domain?

COMBINATION RULE — PHISHING VERDICT (score 9-10):
→ P1 + any of {P2, P3, P4, P5} → phishing → score 9-10
→ P2 + P3 (without P1) → phishing → score 9-10
→ P3 + P4 (without P1) → phishing → score 9-10
→ P5 + any other signal → phishing → score 9-10
→ Only ONE signal present → NOT phishing; raise suspicion only (score 5-7)

IF phishing combination is confirmed → score 9-10 immediately. STOP HERE. Do not check user rules. Do not consider email type. Phishing is always spam.

IF no phishing combination is confirmed → proceed to Step 2.

═══════════════════════════════════════════════════════════════════════════════════
📧 STEP 2: USER RULE MATCHING 🚨
═══════════════════════════════════════════════════════════════════════════════════

Determine the email's type, then check if any user rule applies to that type.

EMAIL TYPE CLASSIFICATION:
- **Newsletter**: Periodic marketing/promotional content, typically with an unsubscribe link. Product updates, feature announcements, company news sent to a mailing list.
- **Marketing/Promotional**: Sales, offers, advertisements, promotional content about products or services.
- **Transactional**: Order confirmations, receipts, invoices, shipping updates, password resets, account notifications directly tied to a user action.
- **Personal**: Direct communication from an individual person.

RULE MATCHING LOGIC:
- A rule about "newsletters" matches emails that are newsletters (periodic marketing/promotional content, product updates, feature announcements).
- A rule about "newsletters" does NOT match: receipts, order confirmations, invoices, shipping notifications, account alerts.
- A rule about "marketing" or "promotional" matches promotional/sales/advertising emails.
- A rule about "marketing" does NOT match: transactional emails, receipts, personal correspondence.
- A rule about specific keywords ONLY matches if those exact keywords appear in the email.
- A rule about specific senders ONLY matches if the sender matches.

CLASSIFYING THE RULE'S INTENT:
- Rules containing words like "spam", "junk", "don't want", "block", "filter", "remove" → classify as SPAM (score 8-10)
- Rules containing words like "ham", "legitimate", "keep", "allow", "important", "always want" → classify as HAM (score 0-2)

IF a user rule matches this email AND classifies it as SPAM:
   → Score 8-10 (depending on how strongly it matches).
   → The reasoning must state: "User rule matched: [quote the matching rule]. This email is [type] which matches the rule as SPAM. Score is [X] based on rule match."
   → STOP HERE. Do NOT apply default guidelines. Do NOT lower the score because the sender is a legitimate brand.

IF a user rule matches this email AND classifies it as HAM:
   → Score 0-2 (depending on how strongly it matches).
   → The reasoning must state: "User rule matched: [quote the matching rule]. This email is [type] which matches the rule as HAM. Score is [X] based on rule match."
   → STOP HERE. Do NOT apply default guidelines. Do NOT raise the score because of minor suspicious indicators.

IF NO user rule matches this email:
   → Proceed to Step 3 (default behavior).

⚠️ FORBIDDEN CONTRADICTIONS — you must NEVER say any of the following:
   - "This matches user rule X BUT it's from a legitimate brand so it's not that bad"
   - "User rule matches HOWEVER the email has an unsubscribe link so it's ok"
   - "This is promotional BUT it's from a well-known company so the rule doesn't fully apply"
   - Any sentence structure that acknowledges a rule match and then diminishes its effect

═══════════════════════════════════════════════════════════════════════════════════
📊 STEP 3: DEFAULT BEHAVIOR (only when no phishing AND no user rule matches)
═══════════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════════
`

    const guidelines = customizeSpamGuidelines
      ? customSpamGuidelines
      : DEFAULT_SPAM_GUIDELINES

    const rulesSection = `
═══════════════════════════════════════════════════════════════════════════════════
USER-DEFINED RULES (Priority 2 — can classify as spam OR ham, override default behavior only):
${rules.length > 0 ? rules.map(rule => `- ${rule.text}`).join('\n') : 'No additional rules defined.'}`

    const similarEmailsText = similarEmails.length > 0
      ? `\n\n═══════════════════════════════════════════════════════════════════════════════════
SIMILAR EMAILS (previously analyzed — use for context only):
${similarEmails.map((similar, index) => {
        let userValidationNote = '';
        let correctClassification = '';

        if (similar.userValidated !== undefined && similar.userValidated !== null) {
          const aiClassification = similar.isSpam ? 'spam' : 'legitimate';
          const userClassification = similar.userValidated ? 'spam' : 'legitimate';

          if (similar.isSpam === similar.userValidated) {
            userValidationNote = `✓ User CONFIRMED this classification`;
            correctClassification = `Correct classification: ${userClassification}`;
          } else {
            userValidationNote = `✗ User CORRECTED - AI was WRONG!`;
            correctClassification = `AI said: ${aiClassification} (INCORRECT) | Actual: ${userClassification} (CORRECT)`;
          }
        } else {
          userValidationNote = 'No user validation (treat as reference only, may be incorrect)';
          correctClassification = `AI classification: ${similar.isSpam ? 'spam' : 'legitimate'} (unverified)`;
        }

        return `Similar Email ${index + 1}:
Subject: ${similar.subject}
Sender: ${similar.sender}
${correctClassification}
Validation: ${userValidationNote}
${similar.userValidated !== undefined && similar.userValidated !== null && similar.isSpam !== similar.userValidated ?
`⚠️ IMPORTANT: The AI was wrong about this email. Do NOT follow the AI's reasoning below - it was incorrect. Learn from this mistake.` :
`AI Reasoning (for reference): ${similar.reasoning}`}`;
      }).join('\n---\n\n')}`
      : ''

    return systemStart + guidelines + rulesSection + similarEmailsText
  }

  private async buildUserPrompt(email: EmailData, shouldSimplify: boolean, simplifyMode: string): Promise<string> {
    // Parse sender name and email from the 'from' field
    const nameEmailMatch = email.from.match(/^([^<]+)<([^>]+)>$/)
    let senderName: string
    let senderEmail: string

    if (nameEmailMatch) {
      senderName = nameEmailMatch[1].trim()
      senderEmail = nameEmailMatch[2].trim()
    } else {
      senderName = 'Unknown'
      senderEmail = email.from
    }

    // Decode and optionally simplify body
    const processedBody = decodeAllBase64Sections(email.body)
    let simplifiedBody: string

    if (shouldSimplify) {
      if (simplifyMode === 'aggressive') {
        simplifiedBody = extractTextFromHTML(processedBody)
      } else {
        const turndownService = this.createTurndownService(simplifyMode)
        simplifiedBody = turndownService.turndown(processedBody)
      }
    } else {
      simplifiedBody = processedBody
    }

    return `Analyze this email and respond ONLY with a valid JSON object.

Sender Name: ${senderName}
Sender Email: ${senderEmail}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

Email body:
---
${simplifiedBody}
---

Respond ONLY with a valid JSON object in this exact format:
{
  "score": <number between 0 and 10>,
  "reasoning": "<brief explanation of your decision>"
}

Do not include any other text or formatting.`
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

    const systemPrompt = this.buildSystemPrompt(rules, similarEmails, customizeSpamGuidelines, customSpamGuidelines)
    const userPrompt = await this.buildUserPrompt(email, simplifyEmailContent, simplifyEmailContentMode)

    const selectedModel = await this.getSelectedModel()
    
    // Retry logic: up to 3 attempts
    let failedAttemptsCost = 0
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Get temperature and topP from settings
        let temperature = 0.1
        let topP = 0.9
        if (typeof window !== 'undefined' && window.aiAPI) {
          temperature = await window.aiAPI.getTemperature()
          topP = await window.aiAPI.getTopP()
        }
        const aiResponse = await aiService.sendMessage(userPrompt, selectedModel, temperature, topP, systemPrompt)

        // Extract JSON from response using regex (handles AI models that add comments)
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          // API call succeeded but response couldn't be parsed - capture the cost before throwing error
          const parsingError = new Error('No valid JSON found in AI response')
          ;(parsingError as Error & { cost: number }).cost = aiResponse.cost
          throw parsingError
        }
        const result = JSON.parse(jsonMatch[0])

        // Validate the response structure
        if (typeof result.score !== 'number' || result.score < 0 || result.score > 10) {
          throw new Error('Invalid spam score in AI response')
        }

        return {
          score: Math.round(result.score), // Ensure it's an integer
          reasoning: result.reasoning || 'No reasoning provided',
          cost: aiResponse.cost,
          failedAttemptsCost: failedAttemptsCost
        }
      } catch (error) {
        // Track the cost of this failed attempt if available
        if (error && typeof error === 'object' && 'cost' in error) {
          failedAttemptsCost += (error as { cost: number }).cost || 0
        }
        if (attempt === 3) {
          // After 3 attempts, re-throw the error to skip the email
          // Include the accumulated failed attempts cost in the error
          const finalError = error instanceof Error ? error : new Error(String(error))
          ;(finalError as Error & { failedAttemptsCost: number }).failedAttemptsCost = failedAttemptsCost
          throw finalError
        }
        // Continue to next attempt
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in analyzeEmail retry logic')
  }
}

