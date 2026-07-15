import { MailConnectionConfig, MailProviderType, AccountStatus } from '#services/mail/mail_types'

export interface AiSettings {
  aiSource: 'ollama' | 'openrouter'
  ollamaBaseUrl: string
  openRouterApiKey: string
  selectedModel: string
  selectedEmbedModel: string
  enableVectorDB: boolean
  customizeSpamGuidelines: boolean
  customSpamGuidelines: string
  temperature: number
  topP: number
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  aiSource: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  openRouterApiKey: '',
  selectedModel: '',
  selectedEmbedModel: '',
  enableVectorDB: false,
  customizeSpamGuidelines: false,
  customSpamGuidelines: '',
  temperature: 0.1,
  topP: 0.9,
}

export interface GeneralSettings {
  aiSensitivity: number
  emailAgeDays: number
  simplifyEmailContent: boolean
  simplifyEmailContentMode: string
  enableCron: boolean
  cronExpression: string
  schedulerMode: string
  schedulerSimpleValue: number
  schedulerSimpleUnit: string
  dateFormat: string
  customDateFormat: string
  timeFormat: '12h' | '24h'
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  aiSensitivity: 7,
  emailAgeDays: 1,
  simplifyEmailContent: true,
  simplifyEmailContentMode: 'aggressive',
  enableCron: true,
  cronExpression: '* * * * *',
  schedulerMode: 'simple',
  schedulerSimpleValue: 1,
  schedulerSimpleUnit: 'minutes',
  dateFormat: 'iso',
  customDateFormat: '{YYYY}-{MM}-{DD}',
  timeFormat: '24h',
}

export interface AccountShape {
  id: string
  type: MailProviderType
  config: MailConnectionConfig
  name?: string
  status: AccountStatus
}
