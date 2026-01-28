import { MailConnectionConfig, MailProvider, TestConnectionResult, FetchEmailsResult, MoveEmailResult, EmailData, GoogleWorkspaceConfig } from './types';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Scopes for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface GmailMessage {
  id: string;
  snippet: string;
  internalDate: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
    };
  };
}

interface GmailMessagesResponse {
  messages?: GmailMessage[];
  resultSizeEstimate?: number;
  nextPageToken?: string;
}

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface GmailLabelsResponse {
  labels?: GmailLabel[];
}

interface GmailMessageDetail {
  id: string;
  snippet: string;
  internalDate: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
    };
  };
}

export class GoogleWorkspaceProvider implements MailProvider {
  // For desktop apps, we use authorization code flow with loopback redirect
  // redirect_uri should be like http://127.0.0.1:{port}/callback
  async initiateAuth(clientId: string, clientSecret: string, redirectUri: string): Promise<{
    authUrl: string;
  }> {
    const authUrl = new URL(AUTH_ENDPOINT);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return { authUrl: authUrl.toString() };
  }

  async exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to exchange code for token');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  }

  async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in,
    };
  }

  async testConnection(config: MailConnectionConfig): Promise<TestConnectionResult> {
    const oauthConfig = config.oauth2Config;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${GMAIL_API}/profile`, {
        headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async fetchEmails(config: MailConnectionConfig, maxAgeDays: number): Promise<FetchEmailsResult> {
    const oauthConfig = config.oauth2Config as GoogleWorkspaceConfig | undefined;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Calculate date filter - Gmail uses internalDate in milliseconds
      const endDate = Date.now();
      const startDate = endDate - maxAgeDays * 24 * 60 * 60 * 1000;

      // Fetch all messages with pagination
      const allMessages: GmailMessage[] = [];
      let pageToken: string | undefined;
      
      do {
        const url = new URL(`${GMAIL_API}/messages`);
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('labelIds', 'INBOX');
        url.searchParams.set('q', `after:${Math.floor(startDate / 1000)}`);
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }
        
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
        });

        if (!response.ok) {
          // Try refreshing token if expired
          if (response.status === 401 && oauthConfig.refreshToken) {
            const tokenResponse = await this.refreshAccessToken(
              oauthConfig.clientId,
              oauthConfig.clientSecret,
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
          throw new Error(`Gmail API error: ${response.status}`);
        }

        const data: GmailMessagesResponse = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          allMessages.push(...data.messages);
        }
        
        pageToken = data.nextPageToken;
      } while (pageToken);

      if (allMessages.length === 0) {
        return { success: true, emails: [] };
      }

      // Fetch full message details for each message (limit to 10 for performance)
      const emails: EmailData[] = [];
      
      for (const msg of allMessages.slice(0, 10)) {
        try {
          const detailResponse = await fetch(`${GMAIL_API}/messages/${msg.id}?format=full`, {
            headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
          });
          
          if (detailResponse.ok) {
            const detail: GmailMessageDetail = await detailResponse.json();
            
            // Extract headers
            const headers = detail.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';
            const fromHeader = headers.find(h => h.name === 'From')?.value || 'Unknown';
            
            // Decode body if available
            let body = detail.snippet || '';
            if (detail.payload?.body?.data) {
              try {
                body = Buffer.from(detail.payload.body.data, 'base64').toString('utf-8');
              } catch {
                // Keep snippet if body decode fails
              }
            }

            emails.push({
              id: detail.id,
              subject,
              from: fromHeader,
              date: new Date(parseInt(detail.internalDate)),
              body,
            });
          }
        } catch {
          // Skip failed message fetches
        }
      }

      return { success: true, emails };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch emails' };
    }
  }

  async moveEmailToSpam(config: MailConnectionConfig, emailId: string): Promise<MoveEmailResult> {
    const oauthConfig = config.oauth2Config as GoogleWorkspaceConfig | undefined;
    if (!oauthConfig?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Find spam label ID
      const spamLabelId = config.spamFolderId || oauthConfig.spamFolderId;
      
      if (!spamLabelId) {
        // If no spam folder ID configured, find it from labels
        const labelsResponse = await fetch(`${GMAIL_API}/labels`, {
          headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
        });

        if (!labelsResponse.ok) {
          throw new Error('Failed to fetch labels');
        }

        const labelsData: GmailLabelsResponse = await labelsResponse.json();
        const spamLabel = labelsData.labels?.find(
          (l: GmailLabel) => l.name.toLowerCase() === 'spam' || l.name.toLowerCase() === 'junk'
        );

        if (!spamLabel) {
          return { success: false, error: 'Spam label not found' };
        }

        // Modify the message to add spam label and remove inbox label
        const modifyResponse = await fetch(`${GMAIL_API}/messages/${emailId}/modify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${oauthConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLabelIds: [spamLabel.id],
            removeLabelIds: ['INBOX'],
          }),
        });

        if (!modifyResponse.ok) {
          throw new Error(`Failed to move email: ${modifyResponse.status}`);
        }

        return { success: true };
      }

      // Modify the message with configured label
      const modifyResponse = await fetch(`${GMAIL_API}/messages/${emailId}/modify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauthConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: [spamLabelId],
          removeLabelIds: ['INBOX'],
        }),
      });

      if (!modifyResponse.ok) {
        throw new Error(`Failed to move email: ${modifyResponse.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to move email to spam' };
    }
  }

  async getMailFolders(config: MailConnectionConfig): Promise<{ name: string; id: string }[]> {
    const oauthConfig = config.oauth2Config as GoogleWorkspaceConfig | undefined;
    if (!oauthConfig?.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${GMAIL_API}/labels`, {
      headers: { Authorization: `Bearer ${oauthConfig.accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch labels');
    }

    const data: GmailLabelsResponse = await response.json();
    
    return (data.labels || []).map((label: GmailLabel) => ({
      name: label.name,
      id: label.id,
    }));
  }
}
