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

export interface ProcessingState {
  isProcessing: boolean
  startTime: number
  accounts: Array<{ id: string; type: string; status: string }>
  rulesCount: number
  maxAgeDays: number
  accountStats: Record<string, ProcessingStats>
  overallStats: ProcessingStats
  currentAccount?: string
}

// Helper function to emit IPC events from renderer process
function emitProcessingEvent(channel: string, data: unknown): void {
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.send) {
    window.electronAPI.send(channel, data)
  }
}

// Module-level singleton to survive page navigation
let singletonInstance: EmailProcessorService | null = null

export class EmailProcessorService {
  private processedChecksums: string[] = []
  private initialized = false
  private isProcessing = false
  private currentProcessingData: {
    accounts: Account[]
    rules: Rule[]
    maxAgeDays: number
    startTime: number
  } | null = null
  
  // In-memory state for real-time updates and state recovery
  private currentAccountStats: Record<string, ProcessingStats> = {}
  private currentOverallStats: ProcessingStats = {
    totalEmails: 0,
    spamEmails: 0,
    processedEmails: 0,
    skippedEmails: 0,
    errors: 0
  }
  private currentAccountId?: string

  constructor(private store: Store) {
    // Don't initialize in constructor - use async initialization
  }

  // Get or create singleton instance
  static getInstance(store: Store): EmailProcessorService {
    if (!singletonInstance) {
      singletonInstance = new EmailProcessorService(store)
    }
    return singletonInstance
  }

  // Check if singleton exists
  static hasInstance(): boolean {
    return singletonInstance !== null
  }

  // Get the singleton instance (returns null if not created yet)
  static getExistingInstance(): EmailProcessorService | null {
    return singletonInstance
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadProcessedChecksums()
      this.initialized = true
    }
  }

  private async loadProcessedChecksums(): Promise<void> {
    try {
      const savedChecksums = await this.store.get('processedEmailChecksums', [])
      // Ensure it's always an array
      this.processedChecksums = Array.isArray(savedChecksums) ? savedChecksums : []
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
      await this.store.set('processedEmailChecksums', this.processedChecksums)
    } catch (error) {
      console.error('Error saving processed checksums:', error)
    }
  }

  private async processAccountEmails(
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
      
      // Set current account for progress updates
      this.currentAccountId = account.id
      
      // Get applicable rules for this account
      const applicableRules = this.getApplicableRules(rules, account.id)
      
      // Fetch unprocessed emails
      const emails = await this.fetchUnprocessedEmails(account, maxAgeDays)
      stats.totalEmails = emails.length

      // Count emails that will be skipped upfront
      let skippedCount = 0
      for (const email of emails) {
        // Check if email is too old
        if (!this.isEmailOldEnough(email.date, maxAgeDays)) {
          skippedCount++
          continue
        }
        
        // Check if already processed
        const checksum = this.generateChecksum(email.subject, email.body)
        if (this.processedChecksums.includes(checksum)) {
          skippedCount++
        }
      }
      stats.skippedEmails = skippedCount

      // Initialize account stats in currentAccountStats
      this.currentAccountStats[account.id] = { ...stats }

      // Emit initial stats update for this account
      this.emitIncrementalStatsUpdate(account.id, stats)

      // Get AI service and configuration
      const sensitivity = await this.getSensitivity()

      for (const email of emails) {
        try {
          // Check if email is old enough to process
          if (!this.isEmailOldEnough(email.date, maxAgeDays)) {
            continue // Already counted as skipped
          }

          // Generate checksum to avoid duplicate processing
          const checksum = this.generateChecksum(email.subject, email.body)
          
          // Ensure processedChecksums is always an array
          if (!Array.isArray(this.processedChecksums)) {
            this.processedChecksums = []
          }
          
          if (this.processedChecksums.includes(checksum)) {
            continue // Already counted as skipped
          }
          
          // Analyze email with AI
          const detector = new SpamDetectorService()

          const result: SpamAnalysisResult = await detector.analyzeEmail(
            email,
            applicableRules
          )

          // Check if email should be moved to spam
          const isSpam = result.score >= sensitivity

          // Save analysis result
          if (typeof window !== 'undefined' && window.analyzedEmailsAPI) {
            try {
              await window.analyzedEmailsAPI.create({
                emailId: email.id,
                subject: email.subject,
                sender: email.from,
                score: result.score,
                reasoning: result.reasoning,
                accountId: account.id,
                isSpam: isSpam
              })
            } catch (error) {
              console.error('Failed to save analyzed email:', error)
            }
          }

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

          // Emit real-time progress update after each email
          this.emitIncrementalStatsUpdate(account.id, stats)

        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error)
          stats.errors++
          // Emit update even on error
          this.emitIncrementalStatsUpdate(account.id, stats)
        }
      }

    } catch (error) {
      console.error(`Error processing account ${account.id}:`, error)
      stats.errors++
    } finally {
      this.currentAccountId = undefined
    }

    // Update final account stats
    this.currentAccountStats[account.id] = stats

    return stats
  }

  // Update in-memory stats and emit real-time update via IPC
  private updateAndEmitStats(accountId: string, accountStats: ProcessingStats): void {
    // Check if we already have stats for this account (prevents double-counting)
    const existingStats = this.currentAccountStats[accountId]
    const hasExistingStats = existingStats && Object.keys(existingStats).length > 0
    
    if (hasExistingStats) {
      // Skip - stats for this account were already accumulated
      return
    }
    
    // Add this account's stats to the overall stats
    this.currentAccountStats[accountId] = accountStats
    this.currentOverallStats = {
      totalEmails: (this.currentOverallStats.totalEmails || 0) + accountStats.totalEmails,
      spamEmails: (this.currentOverallStats.spamEmails || 0) + accountStats.spamEmails,
      processedEmails: (this.currentOverallStats.processedEmails || 0) + accountStats.processedEmails,
      skippedEmails: (this.currentOverallStats.skippedEmails || 0) + accountStats.skippedEmails,
      errors: (this.currentOverallStats.errors || 0) + accountStats.errors
    }
    
    const progress = this.currentOverallStats.totalEmails > 0
      ? Math.round((this.currentOverallStats.processedEmails / this.currentOverallStats.totalEmails) * 100)
      : 0
    
    // Emit stats update via IPC
    emitProcessingEvent('processing:stats-update', {
      accountId,
      stats: accountStats,
      overallStats: this.currentOverallStats
    })
    
    // Emit progress update via IPC
    emitProcessingEvent('processing:progress', {
      totalEmails: this.currentOverallStats.totalEmails,
      processedEmails: this.currentOverallStats.processedEmails,
      progress,
      currentAccount: this.currentAccountId
    })
  }

  // Emit incremental stats update for real-time progress
  private emitIncrementalStatsUpdate(accountId: string, accountStats: ProcessingStats): void {
    // Update the account stats
    this.currentAccountStats[accountId] = accountStats
    
    // Recalculate overall stats from all account stats
    this.currentOverallStats = Object.values(this.currentAccountStats).reduce(
      (overall, stats) => ({
        totalEmails: overall.totalEmails + stats.totalEmails,
        spamEmails: overall.spamEmails + stats.spamEmails,
        processedEmails: overall.processedEmails + stats.processedEmails,
        skippedEmails: overall.skippedEmails + stats.skippedEmails,
        errors: overall.errors + stats.errors
      }),
      { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 }
    )
    
    const progress = this.currentOverallStats.totalEmails > 0
      ? Math.round((this.currentOverallStats.processedEmails / this.currentOverallStats.totalEmails) * 100)
      : 0
    
    // Emit stats update via IPC
    emitProcessingEvent('processing:stats-update', {
      accountId,
      stats: accountStats,
      overallStats: this.currentOverallStats
    })
    
    // Emit progress update via IPC
    emitProcessingEvent('processing:progress', {
      totalEmails: this.currentOverallStats.totalEmails,
      processedEmails: this.currentOverallStats.processedEmails,
      progress,
      currentAccount: this.currentAccountId
    })
  }

  // Calculate progress percentage
  private calculateProgress(stats: ProcessingStats): number {
    if (stats.totalEmails === 0) return 0
    return Math.round((stats.processedEmails / stats.totalEmails) * 100)
  }

  async processAllAccounts(
    accounts: Account[],
    rules: Rule[],
    maxAgeDays: number = 7
  ): Promise<{ accountStats: Record<string, ProcessingStats>; overallStats: ProcessingStats }> {
    if (this.isProcessing) {
      return {
        accountStats: {},
        overallStats: { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 },
      }
    }

    this.isProcessing = true
    this.currentProcessingData = {
      accounts: [...accounts],
      rules: [...rules],
      maxAgeDays,
      startTime: Date.now(),
    }

    // Reset in-memory state for fresh processing
    this.currentAccountStats = {}
    this.currentOverallStats = {
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0,
    }

    // Emit status change to 'processing' via IPC
    emitProcessingEvent('processing:status-change', 'processing')

    const accountStats: Record<string, ProcessingStats> = {}

    try {
      // Filter active accounts
      const activeAccounts = accounts.filter(account => account.status === 'working')

      for (const account of activeAccounts) {
        try {
          const stats = await this.processAccountEmails(account, rules, maxAgeDays)
          accountStats[account.id] = stats
        } catch (error) {
          console.error(`Failed to process account ${account.id}:`, error)
          accountStats[account.id] = {
            totalEmails: 0,
            spamEmails: 0,
            processedEmails: 0,
            skippedEmails: 0,
            errors: 1,
          }
          this.currentOverallStats.errors++
        }
      }
    } catch (error) {
      console.error('Processing error:', error)
      emitProcessingEvent('processing:error', error)
      throw error
    } finally {
      this.isProcessing = false
      this.currentProcessingData = null
      this.currentAccountId = undefined
    }

    // Use the accumulated in-memory stats (they're already correctly aggregated)
    const finalAccountStats = { ...this.currentAccountStats }
    const finalOverallStats = { ...this.currentOverallStats }

    // Emit completion event via IPC
    emitProcessingEvent('processing:complete', { accountStats: finalAccountStats, overallStats: finalOverallStats })
    emitProcessingEvent('processing:status-change', 'completed')

    return { accountStats: finalAccountStats, overallStats: finalOverallStats }
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

  // Methods for processing state tracking
  isCurrentlyProcessing(): boolean {
    return this.isProcessing
  }

  getCurrentProcessingData(): {
    accounts: Account[]
    rules: Rule[]
    maxAgeDays: number
    startTime: number
  } | null {
    return this.currentProcessingData ? { ...this.currentProcessingData } : null
  }

  // Get current processing state for state recovery (real-time + in-memory, no store)
  getCurrentProcessingState(): ProcessingState | null {
    // Check if there's any state to restore
    const hasActiveProcessing = this.isProcessing
    const hasCompletedProcessing = Object.keys(this.currentAccountStats).length > 0
    
    if (!hasActiveProcessing && !hasCompletedProcessing) {
      return null
    }
    
    return {
      isProcessing: this.isProcessing,
      startTime: this.currentProcessingData?.startTime || Date.now(),
      accounts: this.currentProcessingData?.accounts.map(a => ({ id: a.id, type: a.type, status: a.status })) || [],
      rulesCount: this.currentProcessingData?.rules.length || 0,
      maxAgeDays: this.currentProcessingData?.maxAgeDays || 7,
      accountStats: { ...this.currentAccountStats },
      overallStats: { ...this.currentOverallStats },
      currentAccount: this.currentAccountId
    }
  }

  stopProcessing(): void {
    this.isProcessing = false
    this.currentProcessingData = null
    this.currentAccountId = undefined
    emitProcessingEvent('processing:status-change', 'idle')
  }
}
