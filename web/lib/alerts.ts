import { Alert } from './types';

// CustomEvent type for real-time alerts within the renderer process
const ALERT_CREATED_EVENT = 'spambuster:alert-created';
const ALERTS_DELETED_EVENT = 'spambuster:alerts-deleted';
const AI_ALERTS_DELETED_EVENT = 'spambuster:ai-alerts-deleted';

function emitAlertCreated(alert: Alert): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERT_CREATED_EVENT, { detail: alert }));
  }
}
function emitAlertsDeleted(accountName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_DELETED_EVENT, { detail: accountName }));
  }
}
function emitAIAlertsDeleted(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_ALERTS_DELETED_EVENT));
  }
}

// In the web app, alerts are owned by the backend. AlertsManager proxies to it.
export class AlertsManager {
  static async create(alertData: Omit<Alert, 'id'>): Promise<Alert> {
    // Backend is the source of truth; local creation is unsupported in web.
    const alert = { id: crypto.randomUUID(), ...alertData } as Alert;
    emitAlertCreated(alert);
    return alert;
  }

  static async list(): Promise<Alert[]> {
    if (typeof window !== 'undefined' && (window as any).alertsAPI) {
      try {
        return await (window as any).alertsAPI.get();
      } catch {
        return [];
      }
    }
    return [];
  }

  static async delete(id: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).alertsAPI) {
      try {
        await (window as any).alertsAPI.delete(id);
      } catch {
        /* ignore */
      }
    }
  }

  static async existsForAccount(_accountName: string): Promise<boolean> {
    const alerts = await this.list();
    return alerts.some((a) => a.context === 'mail account' && a.user === _accountName);
  }

  static async existsForAI(): Promise<boolean> {
    const alerts = await this.list();
    return alerts.some((a) => a.context === 'AI');
  }

  static async deleteByAccount(_accountName: string, skipEvent = false): Promise<void> {
    const alerts = await this.list();
    const target = alerts.find((a) => a.context === 'mail account' && a.user === _accountName);
    if (target) await this.delete(target.id);
    if (!skipEvent) emitAlertsDeleted(_accountName);
  }

  static async deleteAIAlerts(): Promise<void> {
    const alerts = await this.list();
    for (const a of alerts.filter((a) => a.context === 'AI')) await this.delete(a.id);
    emitAIAlertsDeleted();
  }

  static async createConnectionErrorAlert(
    _accountId: string,
    accountName: string,
    errorMessage: string,
  ): Promise<Alert | null> {
    return this.create({
      type: 'error',
      user: accountName,
      context: 'mail account',
      message: `Connection error: ${errorMessage}`,
      goto: '/settings?tab=mail',
    });
  }

  static async createAIErrorAlert(errorMessage: string): Promise<Alert | null> {
    return this.create({
      type: 'error',
      user: 'AI Provider',
      context: 'AI',
      message: `AI analysis error: ${errorMessage}`,
      goto: '/settings?tab=ai',
    });
  }
}
