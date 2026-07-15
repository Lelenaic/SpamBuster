import { SpamDetectorService, SpamAnalysisResult } from '#services/ai/spam_detector'
import { createAIService } from '#services/ai/ai_factory'
import { MailProviderFactory } from '#services/mail/mail_factory'
import { getLanceDbService } from '#services/vector/lance_db'
import { AlertService, getAlertService } from '#services/alert/alert_service'
import type { AIService } from '#services/ai/ai_types'
import type { Account, EmailData, MailConnectionConfig, MailProviderType, AccountStatus } from '#services/mail/mail_types'
import type { Rule } from '#types'
import type { AiSettings, GeneralSettings } from '#types/settings'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import AccountModel from '#models/account'
import RuleModel from '#models/rule'
import GeneralSetting from '#models/general_setting'
import AiSetting from '#models/ai_setting'
import AnalyzedEmail from '#models/analyzed_email'
import EmailChecksum from '#models/email_checksum'

export type ProcessingEmit = (event: string, data: unknown) => void

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

const MAX_CHECKSUMS = 10000
const instances = new Map<number, ProcessingService>()

export function getProcessingService(userId: number, emit: ProcessingEmit): ProcessingService {
  let service = instances.get(userId)
  if (!service) {
    service = new ProcessingService(userId, emit)
    instances.set(userId, service)
  }
  service.setEmit(emit)
  return service
}

function toAccountShape(model: AccountModel): Account {
  return {
    id: String(model.id),
    type: model.type as MailProviderType,
    config: model.getConfig() as MailConnectionConfig,
    name: model.name ?? undefined,
    status: model.status as AccountStatus,
  }
}

function toRule(model: RuleModel): Rule {
  let accounts: string[] | null = null
  if (model.emailAccounts) {
    try {
      accounts = JSON.parse(model.emailAccounts)
    } catch {
      accounts = null
    }
  }
  return {
    id: String(model.id),
    name: model.name,
    text: model.text,
    enabled: model.enabled,
    emailAccounts: accounts,
  }
}

function aiSettingsFromModel(model: AiSetting): AiSettings {
  return {
    aiSource: model.aiSource as 'ollama' | 'openrouter',
    ollamaBaseUrl: model.ollamaBaseUrl,
    openRouterApiKey: model.getOpenRouterApiKey(),
    selectedModel: model.selectedModel,
    selectedEmbedModel: model.selectedEmbedModel,
    enableVectorDB: model.enableVectorDb,
    customizeSpamGuidelines: model.customizeSpamGuidelines,
    customSpamGuidelines: model.customSpamGuidelines,
    temperature: model.temperature,
    topP: model.topP,
  }
}

function generalSettingsFromModel(model: GeneralSetting): GeneralSettings {
  return {
    aiSensitivity: model.aiSensitivity,
    emailAgeDays: model.emailAgeDays,
    simplifyEmailContent: model.simplifyEmailContent,
    simplifyEmailContentMode: model.simplifyEmailContentMode,
    enableCron: model.enableCron,
    cronExpression: model.cronExpression,
    schedulerMode: model.schedulerMode,
    schedulerSimpleValue: model.schedulerSimpleValue,
    schedulerSimpleUnit: model.schedulerSimpleUnit,
    dateFormat: model.dateFormat,
    customDateFormat: model.customDateFormat,
    timeFormat: model.timeFormat as '12h' | '24h',
  }
}

export class ProcessingService {
  private emit: ProcessingEmit
  private processedChecksums: string[] = []
  private processedChecksumsSet = new Set<string>()
  private initialized = false
  private isProcessing = false
  private shouldStop = false
  private currentProcessingData: {
    accounts: Account[]
    rules: Rule[]
    maxAgeDays: number
    startTime: number
  } | null = null

  private currentAccountStats: Record<string, ProcessingStats> = {}
  private currentOverallStats: ProcessingStats = {
    totalEmails: 0,
    spamEmails: 0,
    processedEmails: 0,
    skippedEmails: 0,
    errors: 0,
  }
  private currentAccountId?: string

  constructor(private userId: number, emit: ProcessingEmit) {
    this.emit = emit
  }

  setEmit(emit: ProcessingEmit) {
    this.emit = emit
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadProcessedChecksums()
      this.initialized = true
    }
  }

  private async loadProcessedChecksums(): Promise<void> {
    try {
      const rows = await EmailChecksum.query().where('user_id', this.userId).orderBy('id', 'asc')
      const rawArray = rows.map((r) => r.checksum)
      this.processedChecksums = rawArray.length > MAX_CHECKSUMS ? rawArray.slice(rawArray.length - MAX_CHECKSUMS) : rawArray
      this.processedChecksumsSet = new Set(this.processedChecksums)
    } catch (error) {
      console.error('❌ Error loading processed checksums:', error)
      this.processedChecksums = []
      this.processedChecksumsSet = new Set()
    }
  }

  private async getSensitivity(generalSettings: GeneralSettings): Promise<number> {
    return generalSettings.aiSensitivity
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
    return rules.filter(
      (rule) =>
        rule.enabled &&
        (rule.emailAccounts === null || (rule.emailAccounts && rule.emailAccounts.includes(accountId)))
    )
  }

  private isConnectionError(errorMessage: string): boolean {
    const connectionErrorKeywords = [
      'connection',
      'timeout',
      'econnrefused',
      'enetunreach',
      'ehostunreach',
      'enotfound',
      'socket',
      'network',
      'disconnected',
      'failed to fetch',
      'unable to connect',
      'cannot connect',
      'login failed',
      'authentication failed',
      'invalid credentials',
    ]
    const lowerMessage = errorMessage.toLowerCase()
    return connectionErrorKeywords.some((keyword) => lowerMessage.includes(keyword))
  }

  private async fetchUnprocessedEmails(
    account: Account,
    maxAgeDays: number
  ): Promise<{ emails: EmailData[]; error?: string; isConnectionError: boolean }> {
    try {
      const provider = MailProviderFactory.createProvider(account.type)
      const result = await provider.fetchEmails(account.config, maxAgeDays)

      if (result.success && result.emails) {
        return { emails: result.emails, isConnectionError: false }
      } else {
        const errorMessage = result.error || 'Unknown error'
        const isConnectionError = this.isConnectionError(errorMessage)
        return { emails: [], error: errorMessage, isConnectionError }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isConnectionError = this.isConnectionError(errorMessage)
      return { emails: [], error: errorMessage, isConnectionError }
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

  private async addChecksum(checksum: string): Promise<void> {
    this.processedChecksums.push(checksum)
    this.processedChecksumsSet.add(checksum)

    await EmailChecksum.create({ userId: this.userId, checksum })

    if (this.processedChecksums.length > MAX_CHECKSUMS) {
      const removed = this.processedChecksums.shift()
      this.processedChecksumsSet.delete(removed!)
      if (removed) {
        await EmailChecksum.query().where('user_id', this.userId).where('checksum', removed).delete()
      }
    }
  }

  private emitIncrementalStatsUpdate(accountId: string, accountStats: ProcessingStats): void {
    this.currentAccountStats[accountId] = accountStats

    this.currentOverallStats = Object.values(this.currentAccountStats).reduce(
      (overall, stats) => ({
        totalEmails: overall.totalEmails + stats.totalEmails,
        spamEmails: overall.spamEmails + stats.spamEmails,
        processedEmails: overall.processedEmails + stats.processedEmails,
        skippedEmails: overall.skippedEmails + stats.skippedEmails,
        errors: overall.errors + stats.errors,
      }),
      { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 }
    )

    const progress =
      this.currentOverallStats.totalEmails > 0
        ? Math.round((this.currentOverallStats.processedEmails / this.currentOverallStats.totalEmails) * 100)
        : 0

    this.emit('stats-update', { accountId, stats: accountStats, overallStats: this.currentOverallStats })
    this.emit('progress', {
      totalEmails: this.currentOverallStats.totalEmails,
      processedEmails: this.currentOverallStats.processedEmails,
      progress,
      currentAccount: this.currentAccountId,
    })
  }

  private async processAccountEmails(
    account: Account,
    rules: Rule[],
    maxAgeDays: number,
    sensitivity: number,
    aiProvider: 'openrouter' | 'ollama',
    detector: SpamDetectorService,
    vectorEnabled: boolean,
    vectorService: ReturnType<typeof getLanceDbService> | null,
    alertService: AlertService
  ): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0,
    }

    try {
      await this.ensureInitialized()
      this.currentAccountId = account.id

      const applicableRules = this.getApplicableRules(rules, account.id)
      const fetchResult = await this.fetchUnprocessedEmails(account, maxAgeDays)

      if (fetchResult.isConnectionError && fetchResult.error) {
        await this.createConnectionErrorAlert(account, fetchResult.error, alertService)
      } else if (!fetchResult.error) {
        await this.clearConnectionAlerts(account, alertService)
      }

      const emails = fetchResult.emails
      stats.totalEmails = emails.length

      let skippedCount = 0
      for (const email of emails) {
        if (!this.isEmailOldEnough(email.date, maxAgeDays)) {
          skippedCount++
          continue
        }
        const checksum = this.generateChecksum(email.subject, email.body)
        if (this.processedChecksumsSet.has(checksum)) {
          skippedCount++
        }
      }
      stats.skippedEmails = skippedCount

      this.currentAccountStats[account.id] = { ...stats }
      this.emitIncrementalStatsUpdate(account.id, stats)

      for (const email of emails) {
        if (this.shouldStop) break

        try {
          if (!this.isEmailOldEnough(email.date, maxAgeDays)) continue

          const checksum = this.generateChecksum(email.subject, email.body)
          if (this.processedChecksumsSet.has(checksum)) continue

          let result: SpamAnalysisResult
          try {
            result = await detector.analyzeEmail(email, applicableRules)
            await alertService.deleteAIAlerts()
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const isExpectedJSONError = errorMessage === 'No valid JSON found in AI response'
            let hasInternalRetries = false
            let internalRetryCost = 0
            if (error && typeof error === 'object' && 'failedAttemptsCost' in error) {
              hasInternalRetries = true
              internalRetryCost = (error as { failedAttemptsCost: number }).failedAttemptsCost || 0
            }

            if (hasInternalRetries) {
              const saved = await AnalyzedEmail.create({
                userId: this.userId,
                accountId: account.id,
                emailId: email.id,
                subject: email.subject,
                sender: email.from,
                body: email.body,
                score: 0,
                reasoning: `Analysis failed after 3 internal retries: ${errorMessage}`,
                isSpam: false,
                cost: internalRetryCost,
                aiProvider,
                analyzedAt: DateTime.local(),
                userValidated: -1,
              })

              this.emit('analyzed-email-created', {
                id: String(saved.id),
                emailId: email.id,
                subject: email.subject,
                sender: email.from,
                score: 0,
                reasoning: `Analysis failed after 3 internal retries: ${errorMessage}`,
                analyzedAt: saved.analyzedAt?.toISO() || new Date().toISOString(),
                accountId: account.id,
                isSpam: false,
              })

              if (vectorEnabled && vectorService) {
                try {
                  await vectorService.storeAnalyzedEmail({
                    id: `failed-${email.id}`,
                    emailId: email.id,
                    subject: email.subject,
                    sender: email.from,
                    body: email.body,
                    score: 0,
                    reasoning: `Analysis failed after 3 internal retries: ${errorMessage}`,
                    accountId: account.id,
                    isSpam: false,
                  })
                } catch (vectorError) {
                  console.error('Failed to store failed email in VectorDB:', vectorError)
                }
              }

              await this.addChecksum(checksum)
              stats.errors++
              this.emitIncrementalStatsUpdate(account.id, stats)
              continue
            }

            if (!isExpectedJSONError) {
              await alertService.createAIErrorAlert(errorMessage)
            }
            stats.errors++
            this.emitIncrementalStatsUpdate(account.id, stats)
            continue
          }

          const isSpam = result.score >= sensitivity

          const saved = await AnalyzedEmail.create({
            userId: this.userId,
            accountId: account.id,
            emailId: email.id,
            subject: email.subject,
            sender: email.from,
            body: email.body,
            score: result.score,
            reasoning: result.reasoning,
            isSpam,
            cost: (result.cost || 0) + (result.failedAttemptsCost || 0),
            aiProvider,
            analyzedAt: DateTime.local(),
            userValidated: -1,
          })

          this.emit('analyzed-email-created', {
            id: String(saved.id),
            emailId: email.id,
            subject: email.subject,
            sender: email.from,
            score: result.score,
            reasoning: result.reasoning,
            analyzedAt: saved.analyzedAt?.toISO() || new Date().toISOString(),
            accountId: account.id,
            isSpam,
          })

          if (vectorEnabled && vectorService) {
            try {
              await vectorService.storeAnalyzedEmail({
                id: String(saved.id),
                emailId: email.id,
                subject: email.subject,
                sender: email.from,
                body: email.body,
                score: result.score,
                reasoning: result.reasoning || 'No reasoning provided',
                accountId: account.id,
                isSpam,
              })
            } catch (vectorError) {
              console.error('Failed to store email in VectorDB:', vectorError)
            }
          }

          if (isSpam) {
            const moved = await this.moveEmailToSpam(account, email.id)
            if (moved) {
              stats.spamEmails++
            }
          }

          await this.addChecksum(checksum)
          stats.processedEmails++
          this.emitIncrementalStatsUpdate(account.id, stats)
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error)
          stats.errors++
          this.emitIncrementalStatsUpdate(account.id, stats)
        }
      }
    } catch (error) {
      console.error(`Error processing account ${account.id}:`, error)
      stats.errors++
    } finally {
      this.currentAccountId = undefined
    }

    this.currentAccountStats[account.id] = stats
    return stats
  }

  private async createConnectionErrorAlert(
    account: Account,
    errorMessage: string,
    alertService: AlertService
  ): Promise<void> {
    try {
      const accountName = account.name || account.config.username || account.id
      await alertService.createConnectionErrorAlert(account.id, accountName, errorMessage)
      await AccountModel.query().where('id', Number(account.id)).where('user_id', this.userId).update({ status: 'trouble' })
    } catch (error) {
      console.error('Failed to create connection error alert:', error)
    }
  }

  private async clearConnectionAlerts(account: Account, alertService: AlertService): Promise<void> {
    try {
      const accountName = account.name || account.config.username || account.id
      await alertService.deleteByAccount(accountName)
      await AccountModel.query().where('id', Number(account.id)).where('user_id', this.userId).update({ status: 'working' })
    } catch (error) {
      console.error('Failed to clear connection alerts:', error)
    }
  }

  async processAllAccounts(
    accountsOverride?: Account[],
    rulesOverride?: Rule[],
    maxAgeDaysOverride?: number
  ): Promise<{ accountStats: Record<string, ProcessingStats>; overallStats: ProcessingStats }> {
    if (this.isProcessing) {
      return {
        accountStats: {},
        overallStats: { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 0 },
      }
    }

    // Load everything for this user
    const accountModels = await AccountModel.query().where('user_id', this.userId)
    const ruleModels = await RuleModel.query().where('user_id', this.userId)
    let generalModel = await GeneralSetting.query().where('user_id', this.userId).first()
    if (!generalModel) generalModel = await GeneralSetting.create({ userId: this.userId })
    let aiModel = await AiSetting.query().where('user_id', this.userId).first()
    if (!aiModel) aiModel = await AiSetting.create({ userId: this.userId })

    const accounts = accountsOverride ?? accountModels.map(toAccountShape)
    const rules = rulesOverride ?? ruleModels.map(toRule)
    const generalSettings = generalSettingsFromModel(generalModel)
    const aiSettings = aiSettingsFromModel(aiModel)
    const maxAgeDays = maxAgeDaysOverride ?? generalSettings.emailAgeDays

    this.isProcessing = true
    this.currentProcessingData = {
      accounts: [...accounts],
      rules: [...rules],
      maxAgeDays,
      startTime: Date.now(),
    }
    this.shouldStop = false
    this.currentAccountStats = {}
    this.currentOverallStats = {
      totalEmails: 0,
      spamEmails: 0,
      processedEmails: 0,
      skippedEmails: 0,
      errors: 0,
    }

    this.emit('status-change', 'processing')

    const alertService = getAlertService(this.userId, (event, data) => {
      this.emit('alert', { event, data })
    })

    let aiService: AIService
    try {
      aiService = await createAIService(aiSettings)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await alertService.createAIErrorAlert(errorMessage)
      this.emit('error', error)
      this.isProcessing = false
      this.currentProcessingData = null
      this.currentAccountId = undefined
      return {
        accountStats: {},
        overallStats: { totalEmails: 0, spamEmails: 0, processedEmails: 0, skippedEmails: 0, errors: 1 },
      }
    }

    const detector = new SpamDetectorService(aiService, {
      selectedModel: aiSettings.selectedModel,
      simplifyEmailContent: generalSettings.simplifyEmailContent,
      simplifyEmailContentMode: generalSettings.simplifyEmailContentMode,
      customizeSpamGuidelines: aiSettings.customizeSpamGuidelines,
      customSpamGuidelines: aiSettings.customSpamGuidelines,
      temperature: aiSettings.temperature,
      topP: aiSettings.topP,
      enableVectorDB: aiSettings.enableVectorDB,
      vectorService: aiSettings.enableVectorDB
        ? getLanceDbService(String(this.userId), aiSettings.ollamaBaseUrl, () => aiSettings.selectedEmbedModel)
        : null,
    })

    const aiProvider: 'openrouter' | 'ollama' = aiSettings.aiSource === 'openrouter' ? 'openrouter' : 'ollama'
    const sensitivity = await this.getSensitivity(generalSettings)

    const accountStats: Record<string, ProcessingStats> = {}

    try {
      const accountsToProcess = accounts.filter((account) => account.status !== 'disabled')

      for (const account of accountsToProcess) {
        try {
          const stats = await this.processAccountEmails(
            account,
            rules,
            maxAgeDays,
            sensitivity,
            aiProvider,
            detector,
            aiSettings.enableVectorDB,
            aiSettings.enableVectorDB ? getLanceDbService(String(this.userId), aiSettings.ollamaBaseUrl, () => aiSettings.selectedEmbedModel) : null,
            alertService
          )
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
      this.emit('error', error)
      throw error
    } finally {
      this.isProcessing = false
      this.currentProcessingData = null
      this.currentAccountId = undefined
    }

    const finalAccountStats = { ...this.currentAccountStats }
    const finalOverallStats = { ...this.currentOverallStats }

    this.emit('complete', { accountStats: finalAccountStats, overallStats: finalOverallStats })
    this.emit('status-change', 'completed')

    return { accountStats: finalAccountStats, overallStats: finalOverallStats }
  }

  async clearProcessedCache(): Promise<void> {
    this.processedChecksums = []
    this.processedChecksumsSet = new Set()
    await EmailChecksum.query().where('user_id', this.userId).delete()
  }

  async getProcessedCount(): Promise<number> {
    await this.ensureInitialized()
    return this.processedChecksums.length
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing
  }

  getCurrentProcessingData(): { accounts: Account[]; rules: Rule[]; maxAgeDays: number; startTime: number } | null {
    return this.currentProcessingData ? { ...this.currentProcessingData } : null
  }

  getCurrentProcessingState(): ProcessingState | null {
    const hasActiveProcessing = this.isProcessing
    const hasCompletedProcessing = Object.keys(this.currentAccountStats).length > 0

    if (!hasActiveProcessing && !hasCompletedProcessing) {
      return null
    }

    return {
      isProcessing: this.isProcessing,
      startTime: this.currentProcessingData?.startTime || Date.now(),
      accounts: this.currentProcessingData?.accounts.map((a) => ({ id: a.id, type: a.type, status: a.status })) || [],
      rulesCount: this.currentProcessingData?.rules.length || 0,
      maxAgeDays: this.currentProcessingData?.maxAgeDays || 1,
      accountStats: { ...this.currentAccountStats },
      overallStats: { ...this.currentOverallStats },
      currentAccount: this.currentAccountId,
    }
  }

  stopProcessing(): void {
    this.shouldStop = true
    this.isProcessing = false
    this.currentProcessingData = null
    this.currentAccountId = undefined
    this.emit('status-change', 'idle')
  }
}
