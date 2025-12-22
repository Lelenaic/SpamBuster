import { Alert } from './types';

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
}
