import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import { getProcessingService } from '#services/processing/processing_service'

function makeEmit(userId: number) {
  return (event: string, data: unknown) => {
    transmit.broadcast(`users/${userId}/processing`, { event, data } as any)
  }
}

export default class ProcessController {
  async start({ auth, response }: HttpContext) {
    const userId = auth.user!.id
    const service = getProcessingService(userId, makeEmit(userId))
    if (service.isCurrentlyProcessing()) {
      return response.conflict({ started: false, message: 'Already processing' })
    }
    service
      .processAllAccounts()
      .catch((error: unknown) => console.error(`[process] failed for user ${userId}:`, error))
    return { started: true }
  }

  async stop({ auth }: HttpContext) {
    const service = getProcessingService(auth.user!.id, makeEmit(auth.user!.id))
    service.stopProcessing()
    return { stopped: true }
  }
}
