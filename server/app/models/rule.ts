import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export default class Rule extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare text: string

  @column()
  declare enabled: boolean

  @column()
  declare emailAccounts: string | null


  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  getEmailAccounts(): string[] | null {
    if (!this.emailAccounts) return null
    try {
      return JSON.parse(this.emailAccounts) as string[]
    } catch {
      return null
    }
  }

  setEmailAccounts(v: string[] | null): void {
    this.emailAccounts = v === null ? null : JSON.stringify(v)
  }
}
