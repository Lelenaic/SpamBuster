export interface MailConnectionConfig {
  // IMAP fields (for backward compatibility)
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  allowUnsignedCertificate?: boolean;
  spamFolder?: string;
  spamFolderId?: string;
  // OAuth2 fields
  authType?: 'password' | 'oauth2';
  oauth2Config?: Microsoft365Config;
}

export interface Microsoft365Config {
  clientId: string;
  tenantId: string;
  userEmail: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  spamFolder?: string;
  spamFolderId?: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

export interface FetchEmailsResult {
  success: boolean;
  emails?: EmailData[];
  error?: string;
}

export interface MoveEmailResult {
  success: boolean;
  error?: string;
}

export interface MailProvider {
  testConnection(config: MailConnectionConfig): Promise<TestConnectionResult>;
  fetchEmails(config: MailConnectionConfig, maxAgeDays: number): Promise<FetchEmailsResult>;
  moveEmailToSpam(config: MailConnectionConfig, emailId: string): Promise<MoveEmailResult>;
  getMailFolders?(config: MailConnectionConfig): Promise<{ name: string; id: string }[]>;
}

export interface EmailData {
  id: string
  subject: string
  body: string
  from: string
  date: Date
}

export type MailProviderType = 'imap' | 'gmail' | 'outlook';

export type AccountStatus = 'working' | 'trouble' | 'disabled';

export interface Account {
  id: string;
  type: MailProviderType;
  config: MailConnectionConfig;
  name?: string; // Optional display name
  status: AccountStatus;
}
