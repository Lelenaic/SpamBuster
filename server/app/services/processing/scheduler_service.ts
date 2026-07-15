import { CronJob, validateCronExpression } from 'cron'
import User from '#models/user'
import GeneralSetting from '#models/general_setting'
import { getProcessingService } from '#services/processing/processing_service'

type SchedulerEmit = (userId: number, event: string, data: unknown) => void

const jobs = new Map<number, CronJob>()

let globalEmit: SchedulerEmit = () => {}

export function setSchedulerEmit(fn: SchedulerEmit): void {
  globalEmit = fn
}

function buildCronExpression(general: GeneralSetting): string {
  if (general.schedulerMode === 'simple') {
    const value = Math.max(1, general.schedulerSimpleValue)
    if (general.schedulerSimpleUnit === 'minutes') return `*/${value} * * * *`
    if (general.schedulerSimpleUnit === 'hours') return `0 */${value} * * *`
    if (general.schedulerSimpleUnit === 'days') return `0 0 */${value} * *`
  }
  return general.cronExpression || '* * * * *'
}

function runUser(userId: number): void {
  const emit = (event: string, data: unknown) => globalEmit(userId, event, data)
  const service = getProcessingService(userId, emit)
  if (service.isCurrentlyProcessing()) return
  service
    .processAllAccounts()
    .catch((error: unknown) => console.error(`[scheduler] processing failed for user ${userId}:`, error))
}

export function registerUser(userId: number, cronExpression: string): void {
  const existing = jobs.get(userId)
  if (existing) {
    existing.stop()
    jobs.delete(userId)
  }

  const validation = validateCronExpression(cronExpression)
  const expr = validation.valid ? cronExpression : '* * * * *'

  const job = new CronJob(expr, () => runUser(userId))
  job.start()
  jobs.set(userId, job)
}

export function unregisterUser(userId: number): void {
  const existing = jobs.get(userId)
  if (existing) {
    existing.stop()
    jobs.delete(userId)
  }
}

export async function refreshAllUsers(): Promise<void> {
  const users = await User.all()
  for (const user of users) {
    const general = await GeneralSetting.query().where('user_id', user.id).first()
    if (general && general.enableCron) {
      registerUser(user.id, buildCronExpression(general))
    } else {
      unregisterUser(user.id)
    }
  }
}

export async function refreshUser(userId: number): Promise<void> {
  const general = await GeneralSetting.query().where('user_id', userId).first()
  if (general && general.enableCron) {
    registerUser(userId, buildCronExpression(general))
  } else {
    unregisterUser(userId)
  }
}
