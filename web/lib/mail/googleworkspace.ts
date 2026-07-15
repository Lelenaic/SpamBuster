import type { MailConnectionConfig } from './types';

// Web shim: Google Workspace connectivity is handled by the backend OAuth
// endpoints. These stubs exist only so v1 wizard/settings imports resolve.
export class GoogleWorkspaceProvider {
  constructor(_config?: unknown) {}

  async initiateAuth(
    _clientId: string,
    _clientSecret: string,
    _redirectUri: string,
  ): Promise<{ authUrl: string }> {
    throw new Error('Google Workspace OAuth is handled by the backend');
  }

  async exchangeCodeForToken(
    _clientId: string,
    _clientSecret: string,
    _code: string,
    _redirectUri: string,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    throw new Error('Google Workspace OAuth is handled by the backend');
  }

  async getMailFolders(
    _config: MailConnectionConfig,
  ): Promise<{ id: string; name: string }[]> {
    return [];
  }
}
