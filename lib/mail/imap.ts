import { MailConnectionConfig, MailProvider, TestConnectionResult, FetchEmailsResult, MoveEmailResult } from './types';

export class ImapProvider implements MailProvider {
  async testConnection(config: MailConnectionConfig): Promise<TestConnectionResult> {
    // Use IPC to test connection in main process
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('test-imap-connection', config);
        return result as TestConnectionResult;
      } catch (error) {
        console.error('IMAP connection test failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
      }
    }
    // Fallback for non-Electron environments (though this app is Electron-only)
    console.error('Electron API not available');
    return { success: false, error: 'Electron API not available' };
  }

  async fetchEmails(config: MailConnectionConfig, maxAgeDays: number): Promise<FetchEmailsResult> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('fetch-emails', config, maxAgeDays);
        return result as FetchEmailsResult;
      } catch (error) {
        console.error('Failed to fetch emails:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch emails' };
      }
    }
    console.error('Electron API not available');
    return { success: false, error: 'Electron API not available' };
  }

  async moveEmailToSpam(config: MailConnectionConfig, emailId: string): Promise<MoveEmailResult> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('move-email-to-spam', config, emailId);
        return result as MoveEmailResult;
      } catch (error) {
        console.error('Failed to move email to spam:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to move email to spam' };
      }
    }
    console.error('Electron API not available');
    return { success: false, error: 'Electron API not available' };
  }
}
