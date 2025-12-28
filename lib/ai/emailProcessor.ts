import { SpamDetectorService, SpamAnalysisResult } from './spamDetector'
import { Account, EmailData } from '../mail/types'
import { MailProviderFactory } from '../mail/factory'
import { Rule } from '../types'
import { createHash } from 'crypto'

// Define Store interface for electron-store
interface Store {
  get: (key: string, defaultValue?: unknown) => unknown
  set: (key: string, value: unknown) => void
}

export interface ProcessedEmailResult {
  emailId: string
  checksum: string
  isSpam: boolean
  score: number
  reasoning: string
}

export interface ProcessingStats {
  totalEmails: number
  spamEmails: number
  processedEmails: number
  skippedEmails: number
  errors: number
}

export class EmailProcessorService {
  private processedChecksums: string[] = []
  private initialized = false

  constructor(private store: Store) {
    // Don't initialize in constructor - use async initialization
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadProcessedChecksums()
      this.initialized = true
    }
  }

  private async loadProcessedChecksums(): Promise<void> {
    try {
      console.log('🔍 Loading processed email checksums from storage...')
      const savedChecksums = await this.store.get('processedEmailChecksums', [])
      // Ensure it's always an array
      this.processedChecksums = Array.isArray(savedChecksums) ? savedChecksums : []
      console.log(`✅ Loaded ${this.processedChecksums.length} processed email checksums`)
      if (this.processedChecksums.length > 0) {
        console.log('📋 First few checksums:', this.processedChecksums.slice(0, 3))
      }
    } catch (error) {
      console.error('❌ Error loading processed checksums:', error)
      this.processedChecksums = []
    }
  }

  private async getSensitivity(): Promise<number> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      return 7
    }
    return await window.aiAPI.getAISensitivity()
  }

  private async getSelectedModel(): Promise<string> {
    if (typeof window === 'undefined' || !window.aiAPI) {
      return ''
    }
    return await window.aiAPI.getSelectedModel()
  }

  private generateChecksum(subject: string, body: string): string {
    const content = `${subject}|${body}`
    return createHash('sha256').update(content).digest('hex')
  }

  private isEmailOldEnough(date: Date, maxAgeDays: number): boolean {
    const now = new Date()
    const emailDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - emailDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= maxAgeDays
  }

  private buildEmailContent(email: EmailData): string {
    return `From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

${email.body}`
  }

  private getApplicableRules(rules: Rule[], accountId: string): Rule[] {
    return rules.filter(rule => 
      rule.enabled && 
      (rule.emailAccounts === null || rule.emailAccounts.includes(accountId))
    )
  }

  private async fetchUnprocessedEmails(account: Account, maxAgeDays: number): Promise<EmailData[]> {
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      const result = await provider.fetchEmails(account.config, maxAgeDays)
      
      if (result.success && result.emails) {
        return result.emails
      } else {
        console.error(`Failed to fetch emails for account ${account.id}:`, result.error)
        return []
      }
    } catch (error) {
      console.error(`Error fetching emails for account ${account.id}:`, error)
      return []
    }
  }

  private async moveEmailToSpam(account: Account, emailId: string): Promise<boolean> {
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      const result = await provider.moveEmailToSpam(account.config, emailId)
      
      return result.success
    } catch (error) {
      console.error(`Error moving email ${emailId} to spam for account ${account.id}:`, error)
      return false
    }
  }

  private async saveProcessedChecksums(): Promise<void> {
    try {
      console.log(`💾 Saving ${this.processedChecksums.length} processed email checksums...`)
      await this.store.set('processedEmailChecksums', this.processedChecksums)
      console.log('✅ Successfully saved processed email checksums')
    } catch (error) {
      console.error('❌ Error saving processed checksums:', error)
    }
  }

  async processAccountEmails(
    account: Account,
    rules: Rule[],
    maxAgeDays: number
  ): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0
    }

    try {
      // Ensure the service is initialized
      await this.ensureInitialized()
      
      // Get applicable rules for this account
      const applicableRules = this.getApplicableRules(rules, account.id)
      
      // Fetch unprocessed emails
      const emails = await this.fetchUnprocessedEmails(account, maxAgeDays)
      stats.totalEmails = emails.length

      // Get AI service and configuration
      const sensitivity = await this.getSensitivity()

      for (const email of emails) {
        try {
          // Check if email is old enough to process
          if (!this.isEmailOldEnough(email.date, maxAgeDays)) {
            stats.skippedEmails++
            continue
          }

          // Generate checksum to avoid duplicate processing
          const checksum = this.generateChecksum(email.subject, email.body)
          
          // Ensure processedChecksums is always an array
          if (!Array.isArray(this.processedChecksums)) {
            this.processedChecksums = []
          }
          
          if (this.processedChecksums.includes(checksum)) {
            console.log(`⏭️  Skipping already processed email: ${email.subject}`)
            stats.skippedEmails++
            continue
          }
          
          console.log(`🆕 Processing new email: ${email.subject}`)

          // Analyze email with AI
          const detector = new SpamDetectorService();
          
          const result: SpamAnalysisResult = await detector.analyzeEmail(
            this.buildEmailContent(email),
            applicableRules
          )

          // Check if email should be moved to spam
          const isSpam = result.score >= sensitivity

          if (isSpam) {
            // Move email to spam folder
            const moved = await this.moveEmailToSpam(account, email.id)
            if (moved) {
              stats.spamEmails++
            }
          }

          // Mark as processed
          this.processedChecksums.push(checksum)
          await this.saveProcessedChecksums() // Save immediately after adding
          stats.processedEmails++

        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error)
          stats.errors++
        }
      }

    } catch (error) {
      console.error(`Error processing account ${account.id}:`, error)
      stats.errors++
    }

    return stats
  }

  async processAllAccounts(
    accounts: Account[],
    rules: Rule[],
    maxAgeDays: number = 7
  ): Promise<{ accountStats: Record<string, ProcessingStats>; overallStats: ProcessingStats }> {
    const accountStats: Record<string, ProcessingStats> = {}
    const overallStats: ProcessingStats = {
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0
    }

    // Filter active accounts
    const activeAccounts = accounts.filter(account => account.status === 'working')

    for (const account of activeAccounts) {
      try {
        const stats = await this.processAccountEmails(account, rules, maxAgeDays)
        accountStats[account.id] = stats

        // Aggregate stats
        overallStats.totalEmails += stats.totalEmails
        overallStats.spamEmails += stats.spamEmails
        overallStats.processedEmails += stats.processedEmails
        overallStats.skippedEmails += stats.skippedEmails
        overallStats.errors += stats.errors

      } catch (error) {
        console.error(`Failed to process account ${account.id}:`, error)
        accountStats[account.id] = {
          totalEmails: 0,
          spamEmails: 0,
          processedEmails: 0,
          skippedEmails: 0,
          errors: 1
        }
        overallStats.errors++
      }
    }

    return { accountStats, overallStats }
  }

  async clearProcessedCache(): Promise<void> {
    this.processedChecksums = []
    try {
      await this.store.set('processedEmailChecksums', [])
    } catch (error) {
      console.error('Error clearing processed checksums from storage:', error)
    }
  }

  async getProcessedCount(): Promise<number> {
    await this.ensureInitialized()
    return this.processedChecksums.length
  }

  async refreshProcessedChecksums(): Promise<void> {
    await this.loadProcessedChecksums()
  }

  async hasEmailBeenProcessed(subject: string, body: string): Promise<boolean> {
    await this.ensureInitialized()
    const checksum = this.generateChecksum(subject, body)
    return this.processedChecksums.includes(checksum)
  }
}
