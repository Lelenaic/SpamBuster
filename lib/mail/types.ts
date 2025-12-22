export interface MailConnectionConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  allowUnsignedCertificate?: boolean;
  // Add other common options as needed
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

export interface MailProvider {
  testConnection(config: MailConnectionConfig): Promise<TestConnectionResult>;
  // Add other methods as needed, like fetchEmails, etc.
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
