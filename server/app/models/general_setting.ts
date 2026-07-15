import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export default class GeneralSetting extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare aiSensitivity: number

  @column()
  declare emailAgeDays: number

  @column()
  declare simplifyEmailContent: boolean

  @column()
  declare simplifyEmailContentMode: string

  @column()
  declare enableCron: boolean

  @column()
  declare cronExpression: string

  @column()
  declare schedulerMode: string

  @column()
  declare schedulerSimpleValue: number

  @column()
  declare schedulerSimpleUnit: string

  @column()
  declare dateFormat: string

  @column()
  declare customDateFormat: string

  @column()
  declare timeFormat: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
