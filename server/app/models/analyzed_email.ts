import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import Account from '#models/account'

export default class AnalyzedEmail extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare accountId: string

  @column()
  declare emailId: string

  @column()
  declare subject: string

  @column()
  declare sender: string

  @column()
  declare body: string

  @column()
  declare score: number

  @column()
  declare reasoning: string

  @column()
  declare isSpam: boolean

  @column()
  declare cost: number

  @column()
  declare aiProvider: string

  @column.dateTime()
  declare analyzedAt: DateTime | null

  @column()
  declare userValidated: number | null


  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>
}
