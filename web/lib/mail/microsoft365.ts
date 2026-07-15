import type { MailConnectionConfig } from './types';

// Web shim: Microsoft 365 connectivity is handled by the backend OAuth
// endpoints. These stubs exist only so v1 wizard/settings imports resolve.
export class Microsoft365Provider {
  constructor(_config?: unknown) {}

  async initiateAuth(
    _clientId: string,
    _tenantId: string,
  ): Promise<{ userCode: string; deviceCode: string; verificationUri: string; message: string }> {
    throw new Error('Microsoft 365 OAuth is handled by the backend');
  }

  async exchangeCodeForToken(
    _clientId: string,
    _tenantId: string,
    _deviceCode: string,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    throw new Error('Microsoft 365 OAuth is handled by the backend');
  }

  async getMailFolders(
    _config: MailConnectionConfig,
  ): Promise<{ id: string; name: string }[]> {
    return [];
  }
}
