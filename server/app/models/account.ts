import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import { MailConnectionConfig } from '#services/mail/mail_types'
import { encryptValue, decryptValue } from '#services/encryption'

export default class Account extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: string

  @column()
  declare name: string | null

  @column()
  declare status: string

  @column()
  declare configEncrypted: string


  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  getConfig(): MailConnectionConfig {
    return JSON.parse(decryptValue(this.configEncrypted)) as MailConnectionConfig
  }

  setConfig(config: MailConnectionConfig): void {
    this.configEncrypted = encryptValue(JSON.stringify(config))
  }
}
