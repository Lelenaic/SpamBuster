import type { Alert } from '#types'
import AlertModel from '#models/alert'

export type AlertBroadcast = (event: 'created' | 'deleted' | 'ai-deleted', data: Alert | string | null) => void

const cache = new Map<number, AlertService>()

export function getAlertService(userId: number, broadcast: AlertBroadcast): AlertService {
  let service = cache.get(userId)
  if (!service) {
    service = new AlertService(userId, broadcast)
    cache.set(userId, service)
  }
  service.setBroadcast(broadcast)
  return service
}

export class AlertService {
  private broadcast: AlertBroadcast

  constructor(private userId: number, broadcast: AlertBroadcast) {
    this.broadcast = broadcast
  }

  setBroadcast(broadcast: AlertBroadcast) {
    this.broadcast = broadcast
  }

  private toAlert(row: AlertModel): Alert {
    return {
      id: String(row.id),
      type: row.type as Alert['type'],
      user: row.user,
      context: row.context,
      message: row.message,
      goto: row.goto ?? undefined,
    }
  }

  async list(): Promise<Alert[]> {
    const rows = await AlertModel.query().where('user_id', this.userId).orderBy('id', 'desc')
    return rows.map((r) => this.toAlert(r))
  }

  async create(data: Omit<Alert, 'id'>): Promise<Alert> {
    const row = await AlertModel.create({
      userId: this.userId,
      type: data.type,
      user: data.user,
      context: data.context,
      message: data.message,
      goto: data.goto ?? null,
    })
    const alert = this.toAlert(row)
    this.broadcast('created', alert)
    return alert
  }

  async delete(id: string): Promise<void> {
    await AlertModel.query().where('user_id', this.userId).where('id', id).delete()
    this.broadcast('deleted', null)
  }

  async deleteByAccount(accountName: string, skipEvent = false): Promise<void> {
    await AlertModel.query()
      .where('user_id', this.userId)
      .where('context', 'mail account')
      .where('user', accountName)
      .delete()
    if (!skipEvent) this.broadcast('deleted', accountName)
  }

  async deleteAIAlerts(): Promise<void> {
    await AlertModel.query().where('user_id', this.userId).where('context', 'AI').delete()
    this.broadcast('ai-deleted', null)
  }

  async existsForAccount(accountName: string): Promise<boolean> {
    const rows = await AlertModel.query()
      .where('user_id', this.userId)
      .where('context', 'mail account')
      .where('user', accountName)
      .count('* as total')
    return Number(rows[0].$extras.total) > 0
  }

  async existsForAI(): Promise<boolean> {
    const rows = await AlertModel.query()
      .where('user_id', this.userId)
      .where('context', 'AI')
      .count('* as total')
    return Number(rows[0].$extras.total) > 0
  }

  async createConnectionErrorAlert(
    _accountId: string,
    accountName: string,
    errorMessage: string
  ): Promise<Alert | null> {
    if (await this.existsForAccount(accountName)) return null
    await this.deleteByAccount(accountName, true)
    return this.create({
      type: 'error',
      user: accountName,
      context: 'mail account',
      message: `Connection error: ${errorMessage}`,
      goto: '/settings?tab=mail',
    })
  }

  async createAIErrorAlert(errorMessage: string): Promise<Alert | null> {
    if (await this.existsForAI()) return null
    return this.create({
      type: 'error',
      user: 'AI Provider',
      context: 'AI',
      message: `AI analysis error: ${errorMessage}`,
      goto: '/settings?tab=ai',
    })
  }
}
