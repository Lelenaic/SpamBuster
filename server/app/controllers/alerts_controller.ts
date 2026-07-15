import type { HttpContext } from '@adonisjs/core/http'
import { getAlertService } from '#services/alert/alert_service'

export default class AlertsController {
  async index({ auth }: HttpContext) {
    const service = getAlertService(auth.user!.id, () => {})
    return service.list()
  }
}
