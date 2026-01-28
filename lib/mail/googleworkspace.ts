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
    parts?: GmailPart[];
  };
}

/**
 * Type for MIME parts in email payload - defined outside class
 */
interface GmailPart {
  mimeType: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailPart[];
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

  /**
   * Helper method to decode body data with proper encoding handling
   */
  private decodeBodyData(data: string, encoding?: string): string {
    if (!data) return '';
    
    try {
      // Gmail uses base64url encoding (replace -_ with +/)
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64, 'base64');
      
      if (encoding === 'quoted-printable') {
        // Decode quoted-printable
        return decoded.toString('utf-8')
          .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/=\r?\n/g, '');
      }
      
      return decoded.toString('utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Helper method to extract body content from deeply nested MIME parts
   * Traverses nested parts to find the actual email body (preferring HTML over plain text)
   */
  private extractBodyFromParts(parts: GmailPart[], depth: number = 0): string | null {
    if (!parts || depth > 10) return null; // Prevent infinite recursion
    
    let plainTextFallback = '';
    
    for (const part of parts) {
      const mimeType = part.mimeType?.toLowerCase() || '';
      
      // Check if this part has direct body data
      if (part.body?.data && (part.body.size ?? 0) > 0) {
        const encoding = part.headers?.find(h => h.name?.toLowerCase() === 'content-transfer-encoding')?.value;
        const decoded = this.decodeBodyData(part.body.data, encoding);
        if (decoded) {
          // Prefer HTML over plain text
          if (mimeType === 'text/html') {
            return decoded;
          }
          // Store plain text as fallback, continue looking for HTML
          if (mimeType === 'text/plain') {
            plainTextFallback = decoded;
          }
        }
      }
      
      // Recursively check nested parts
      if (part.parts && part.parts.length > 0) {
        const nestedBody = this.extractBodyFromParts(part.parts, depth + 1);
        if (nestedBody) {
          return nestedBody;
        }
      }
    }
    
    // Return plain text if no HTML found
    return plainTextFallback || null;
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
            
            // Decode body - prefer full body over snippet
            let body = detail.snippet || '';
            
            // First, try to get body from payload.body.data
            if (detail.payload?.body?.data) {
              try {
                body = Buffer.from(detail.payload.body.data, 'base64').toString('utf-8');
              } catch {
                // Keep snippet if body decode fails
              }
            }
            
            // Second, try to get body from parts (multipart messages)
            if (detail.payload?.parts && detail.payload.parts.length > 0 && body === detail.snippet) {
              const fullBodyFromParts = this.extractBodyFromParts(detail.payload.parts);
              if (fullBodyFromParts && fullBodyFromParts.length > body.length) {
                body = fullBodyFromParts;
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

    // Pre-emptively refresh token if expired or expiring soon
    const accessToken = oauthConfig.accessToken;
    const tokenExpiry = oauthConfig.tokenExpiry ? new Date(oauthConfig.tokenExpiry).getTime() : 0;
    const now = Date.now();
    
    if (oauthConfig.refreshToken && (tokenExpiry === 0 || now >= tokenExpiry - 60000)) {
      // Token is expired or expires within 1 minute, refresh it
      const tokenResponse = await this.refreshAccessToken(
        oauthConfig.clientId,
        oauthConfig.clientSecret,
        oauthConfig.refreshToken
      );
      
      if (tokenResponse.access_token) {
        oauthConfig.accessToken = tokenResponse.access_token;
        oauthConfig.refreshToken = tokenResponse.refresh_token || oauthConfig.refreshToken;
        oauthConfig.tokenExpiry = new Date(now + tokenResponse.expires_in * 1000);
      }
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
