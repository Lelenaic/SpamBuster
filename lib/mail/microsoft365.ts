import { MailConnectionConfig, MailProvider, TestConnectionResult, FetchEmailsResult, MoveEmailResult, EmailData } from './types';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

interface GraphMailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  receivedDateTime: string;
  body?: {
    content: string;
    contentType: string;
  };
  bodyPreview: string;
}

interface GraphMailFolder {
  id: string;
  displayName: string;
}

interface GraphMessagesResponse {
  value: GraphMailMessage[];
}

interface GraphFoldersResponse {
  value: GraphMailFolder[];
  '@odata.nextLink'?: string;
}

export class Microsoft365Provider implements MailProvider {
  async initiateAuth(clientId: string, tenantId: string = 'common'): Promise<{
    userCode: string;
    deviceCode: string;
    verificationUri: string;
    expiresIn: number;
    message: string;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window.oauthAPI as any).getDeviceCode(clientId, tenantId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to initiate auth');
    }
    
    return {
      userCode: result.user_code,
      deviceCode: result.device_code,
      verificationUri: result.verification_uri,
      expiresIn: result.expires_in,
      message: result.message,
    };
  }

  async exchangeCodeForToken(
    clientId: string,
    tenantId: string,
    deviceCode: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window.oauthAPI as any).exchangeCode(clientId, tenantId, deviceCode);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to exchange code for token');
    }
    
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    };
  }

  async refreshAccessToken(
    clientId: string,
    tenantId: string,
    refreshToken: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window.oauthAPI as any).refreshToken(clientId, tenantId, refreshToken);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to refresh token');
    }
    
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    };
  }

  async testConnection(config: MailConnectionConfig): Promise<TestConnectionResult> {
    const oauthConfig = config.oauth2Config;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${GRAPH_API}/me`, {
        headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async fetchEmails(config: MailConnectionConfig, maxAgeDays: number): Promise<FetchEmailsResult> {
    const oauthConfig = config.oauth2Config;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Calculate date filter - Microsoft Graph API OData filter
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - maxAgeDays);
      const filterDate = startDate.toISOString();

      // Use raw URL without encoding - Microsoft Graph API expects unencoded datetime values
      // Format: receivedDateTime ge 2026-01-26T16:49:08.537Z (NO quotes, NO datetime wrapper)
      const url = `${GRAPH_API}/me/mailFolders/Inbox/messages?$filter=receivedDateTime ge ${filterDate}&$select=id,subject,from,receivedDateTime,body,bodyPreview&$top=50`;

      const response = await fetch(url, {
          headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
        }
      );

      if (!response.ok) {
        // Try refreshing token if expired
        if (response.status === 401 && oauthConfig.refreshToken) {
          const tokenResponse = await this.refreshAccessToken(
            oauthConfig.clientId,
            oauthConfig.tenantId,
            oauthConfig.refreshToken
          );
          
          if (tokenResponse.access_token) {
            oauthConfig.accessToken = tokenResponse.access_token;
            oauthConfig.refreshToken = tokenResponse.refresh_token || oauthConfig.refreshToken;
            oauthConfig.tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);
            
            // Retry request
            return this.fetchEmails(config, maxAgeDays);
          }
        }
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data: GraphMessagesResponse = await response.json();
      const emails: EmailData[] = data.value.map((msg: GraphMailMessage) => ({
        id: msg.id,
        subject: msg.subject,
        from: msg.from?.emailAddress?.address || 'Unknown',
        date: new Date(msg.receivedDateTime),
        body: msg.body?.content || msg.bodyPreview || '',
      }));

      return { success: true, emails };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch emails' };
    }
  }

  async moveEmailToSpam(config: MailConnectionConfig, emailId: string): Promise<MoveEmailResult> {
    const oauthConfig = config.oauth2Config;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Use configured spam folder ID if available, otherwise search for it
      let spamFolderId = config.spamFolderId || oauthConfig.spamFolderId;
      
      if (!spamFolderId) {
        // If no spam folder ID configured, try to use the folder name to find it
        const spamFolderName = config.spamFolder || oauthConfig.spamFolder || 'Junk Email';
        
        // Find the folder by name
        const foldersResponse = await fetch(`${GRAPH_API}/me/mailFolders`, {
          headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
        });

        if (!foldersResponse.ok) {
          throw new Error('Failed to fetch mail folders');
        }

        const foldersData: GraphFoldersResponse = await foldersResponse.json();
        const spamFolder = foldersData.value.find(
          (f: GraphMailFolder) => f.displayName.toLowerCase() === spamFolderName.toLowerCase() || 
                                    f.displayName.toLowerCase() === 'junk email' || 
                                    f.displayName.toLowerCase() === 'spam'
        );

        if (!spamFolder) {
          return { success: false, error: 'Spam folder not found' };
        }
        
        spamFolderId = spamFolder.id;
      }

      // Move the email to the spam folder
      const moveResponse = await fetch(
        `${GRAPH_API}/me/messages/${emailId}/move`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${oauthConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destinationId: spamFolderId,
          }),
        }
      );

      if (!moveResponse.ok) {
        throw new Error(`Failed to move email: ${moveResponse.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to move email to spam' };
    }
  }

  async getMailFolders(config: MailConnectionConfig): Promise<{ name: string; id: string }[]> {
    const oauthConfig = config.oauth2Config;
    if (!oauthConfig?.accessToken) {
      throw new Error('Not authenticated');
    }

    const allFolders: { name: string; id: string }[] = [];
    let nextLink: string | undefined = `${GRAPH_API}/me/mailFolders?$top=100`;

    while (nextLink) {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mail folders');
      }

      const data: GraphFoldersResponse = await response.json();
      
      allFolders.push(...data.value.map((folder: GraphMailFolder) => ({
        name: folder.displayName,
        id: folder.id,
      })));

      nextLink = data['@odata.nextLink'];
    }

    return allFolders;
  }
}
