import { MailConnectionConfig, MailProvider, TestConnectionResult } from './types';

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
}
