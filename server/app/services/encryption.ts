import { AIService } from '#services/ai/ai_types'
import { MailConnectionConfig, MailProviderType, AccountStatus } from '#services/mail/mail_types'

/**
 * Helper to encrypt/decrypt secrets at rest using the Adonis app key.
 * Use for IMAP passwords, OAuth tokens, OpenRouter keys, etc.
 */
import encryption from '@adonisjs/core/services/encryption'

export function encryptValue(value: string): string {
  if (!value) return value
  return encryption.encrypt(value)
}

export function decryptValue(value: string | null | undefined): string {
  if (!value) return ''
  try {
    const decrypted = encryption.decrypt(value) as unknown as string | null
    return decrypted ?? value
  } catch {
    return value
  }
}

export type { AIService, MailConnectionConfig, MailProviderType, AccountStatus }
