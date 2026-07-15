import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import { encryptValue, decryptValue } from '#services/encryption'

export default class AiSetting extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare aiSource: string

  @column()
  declare ollamaBaseUrl: string

  @column()
  declare openRouterApiKey: string

  @column()
  declare selectedModel: string

  @column()
  declare selectedEmbedModel: string

  @column()
  declare enableVectorDb: boolean

  @column()
  declare customizeSpamGuidelines: boolean

  @column()
  declare customSpamGuidelines: string

  @column()
  declare temperature: number

  @column()
  declare topP: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  setOpenRouterApiKey(v: string): void {
    this.openRouterApiKey = encryptValue(v)
  }

  getOpenRouterApiKey(): string {
    return decryptValue(this.openRouterApiKey)
  }
}
