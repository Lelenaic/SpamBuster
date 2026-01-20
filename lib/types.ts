export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  user: string;
  context: string; // e.g., 'mail account', 'AI'
  message: string;
  goto?: string; // optional route or URL to fix the issue
}

export interface Rule {
  id: string;
  name: string;
  text: string;
  enabled: boolean;
  emailAccounts: string[] | null; // null means apply to all accounts
}

export {};
