import { Alert } from './types';

// CustomEvent type for real-time alerts within the renderer process
const ALERT_CREATED_EVENT = 'spambuster:alert-created';
const ALERTS_DELETED_EVENT = 'spambuster:alerts-deleted';
const AI_ALERTS_DELETED_EVENT = 'spambuster:ai-alerts-deleted';

// Helper function to emit event for real-time alert updates
function emitAlertCreated(alert: Alert): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERT_CREATED_EVENT, { detail: alert }));
  }
}

// Helper function to emit event when alerts are deleted
function emitAlertsDeleted(accountName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_DELETED_EVENT, { detail: accountName }));
  }
}

// Helper function to emit event when AI alerts are deleted
function emitAIAlertsDeleted(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_ALERTS_DELETED_EVENT));
  }
}

export class AlertsManager {
  private static readonly STORAGE_KEY = 'alerts';

  static async create(alertData: Omit<Alert, 'id'>): Promise<Alert> {
    const alerts = await this.list();
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      ...alertData
    };
    alerts.push(newAlert);
    await window.storeAPI.set(this.STORAGE_KEY, alerts);
    
    // Emit event for real-time updates
    emitAlertCreated(newAlert);
    
    return newAlert;
  }

  static async list(): Promise<Alert[]> {
    const data = await window.storeAPI.get(this.STORAGE_KEY);
    return Array.isArray(data) ? data as Alert[] : [];
  }

  static async delete(id: string): Promise<void> {
    const alerts = await this.list();
    const filtered = alerts.filter(a => a.id !== id);
    await window.storeAPI.set(this.STORAGE_KEY, filtered);
  }

  /**
   * Check if an alert already exists for a specific mail account
   * Uses the user field (account name) to identify the account
   */
  static async existsForAccount(accountName: string): Promise<boolean> {
    const alerts = await this.list();
    return alerts.some(alert =>
      alert.context === 'mail account' &&
      alert.user === accountName
    );
  }

  /**
   * Check if an AI alert already exists
   */
  static async existsForAI(): Promise<boolean> {
    const alerts = await this.list();
    return alerts.some(alert => alert.context === 'AI');
  }

  /**
   * Delete all alerts for a specific mail account
   */
  static async deleteByAccount(accountName: string, skipEvent = false): Promise<void> {
    const alerts = await this.list();
    const filtered = alerts.filter(alert =>
      !(alert.context === 'mail account' && alert.user === accountName)
    );
    await window.storeAPI.set(this.STORAGE_KEY, filtered);

    // Emit event for real-time updates (skip if we're about to create a new alert)
    if (!skipEvent) {
      emitAlertsDeleted(accountName);
    }
  }

  /**
   * Delete all AI alerts
   */
  static async deleteAIAlerts(): Promise<void> {
    const alerts = await this.list();
    const filtered = alerts.filter(alert => alert.context !== 'AI');
    await window.storeAPI.set(this.STORAGE_KEY, filtered);

    // Emit event for real-time updates
    emitAIAlertsDeleted();
  }

  /**
   * Create an alert for a mail account connection error
   */
  static async createConnectionErrorAlert(
    accountId: string,
    accountName: string,
    errorMessage: string
  ): Promise<Alert | null> {
    // Check if alert already exists for this account
    const existing = await this.existsForAccount(accountName);
    if (existing) {
      console.log(`[DEBUG] Alert already exists for ${accountName}, skipping creation`);
      return null;
    }

    // Delete any existing alerts for this account first (cleanup)
    // Pass skipEvent=true to prevent "Connection restored" toast when we're about to create a new error
    console.log(`[DEBUG] Deleting alerts for ${accountName} (skipping event)`);
    await this.deleteByAccount(accountName, true);

    console.log(`[DEBUG] Creating new connection error alert for: ${accountName}`);
    return this.create({
      type: 'error',
      user: accountName,
      context: 'mail account',
      message: `Connection error: ${errorMessage}`,
      goto: '/settings?tab=mail'
    });
  }

  /**
   * Create an alert for AI provider error
   */
  static async createAIErrorAlert(errorMessage: string): Promise<Alert | null> {
    // Check if AI alert already exists
    const existing = await this.existsForAI();
    if (existing) {
      console.log(`[DEBUG] AI alert already exists, skipping creation`);
      return null;
    }

    console.log(`[DEBUG] Creating new AI error alert`);
    return this.create({
      type: 'error',
      user: 'AI Provider',
      context: 'AI',
      message: `AI analysis error: ${errorMessage}`,
      goto: '/settings?tab=ai'
    });
  }
}
