import type { MailProvider, MailProviderType, MailConnectionConfig } from './types';
import { api } from '../bridge';

// Web implementation: mail connectivity is validated by the backend
// (POST /accounts/test) which runs the real IMAP/OAuth providers server-side.
export class MailProviderFactory {
  static createProvider(type: MailProviderType): MailProvider {
    return {
      testConnection: async (config: MailConnectionConfig) => {
        try {
          return await api<{ success: boolean; error?: string }>('/accounts/test', {
            method: 'POST',
            body: JSON.stringify({ type, config }),
          });
        } catch (e: any) {
          return { success: false, error: e?.message || 'Connection test failed' };
        }
      },
      fetchEmails: async () => ({ success: false, error: 'Not available in web' }),
      moveEmailToSpam: async () => ({ success: false, error: 'Not available in web' }),
    };
  }
  static create(config: MailConnectionConfig): MailProvider {
    const type: MailProviderType =
      config.authType === 'oauth2' && config.oauth2Config
        ? 'tenantId' in config.oauth2Config
          ? 'outlook'
          : 'gmail'
        : 'imap';
    return this.createProvider(type);
  }
}
