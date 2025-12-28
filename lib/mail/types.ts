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
