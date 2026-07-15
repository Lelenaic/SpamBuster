export interface SimilarEmail {
  id: string
  emailId: string
  subject: string
  sender: string
  body: string
  score: number
  reasoning: string
  accountId: string
  isSpam: boolean
  analyzedAt: string
  userValidated?: boolean | null
  similarity: number
}

export interface VectorService {
  findSimilarEmails(queryText: string, limit?: number, accountId?: string): Promise<SimilarEmail[]>
  storeAnalyzedEmail(data: {
    id: string
    emailId: string
    subject: string
    sender: string
    body: string
    score: number
    reasoning: string
    accountId: string
    isSpam: boolean
  }): Promise<void>
  updateUserValidation(emailId: string, userValidated: boolean | null): Promise<void>
  getEmailCount(): Promise<number>
  clearAllEmails(): Promise<void>
}
