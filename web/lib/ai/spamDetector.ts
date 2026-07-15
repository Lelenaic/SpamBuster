export const DEFAULT_SPAM_GUIDELINES = `Spam emails typically contain:
- Unsolicited commercial offers, promotions, or deals
- Requests for personal, financial, or login information
- Urgent or threatening language pressuring immediate action
- Suspicious links or attachments
- Poor grammar, spelling mistakes, or unusual formatting
- Impersonation of legitimate companies, banks, or government agencies
- Lottery, prize, or inheritance scams
- Cryptocurrency or investment schemes
- Phishing attempts to steal credentials
- Newsletter or mailing list content the user did not sign up for
- Content unrelated to the user's normal correspondence`;

export interface SpamAnalysisResult {
  score: number;
  reasoning: string;
  isSpam: boolean;
  cost?: number;
  failedAttemptsCost?: number;
}

export class SpamDetectorService {
  async analyzeEmail(): Promise<SpamAnalysisResult> {
    return { score: 0, reasoning: '', isSpam: false };
  }
}
