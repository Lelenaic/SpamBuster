import type {
  MailConnectionConfig,
  MailProvider,
  TestConnectionResult,
  FetchEmailsResult,
  MoveEmailResult,
  EmailData
} from '#services/mail/mail_types'

export class ImapProvider implements MailProvider {
  private ImapFlowClass: any = null

  private async getImapFlow(): Promise<any> {
    if (!this.ImapFlowClass) {
      const imapflowModule = await import('imapflow')
      this.ImapFlowClass = imapflowModule.ImapFlow
    }
    return this.ImapFlowClass
  }

  // Create a logger that silences network-related errors (ETIMEDOUT, etc.)
  // These are expected when there's no internet connection
  private createSilentLogger() {
    const networkErrorCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EPIPE',
      'socket hang up',
      'Connection closed',
      'read ETIMEDOUT',
    ];

    return {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: (msg: unknown, err?: unknown) => {
        // Silently ignore network-related errors that are expected when offline
        // Handle cases where msg or err might not be strings
        const errorMessage = String(msg || '') + String((err as { message?: unknown })?.message || '');
        const isNetworkError = networkErrorCodes.some((code) => errorMessage.includes(code));

        if (!isNetworkError) {
          console.error('[IMAP]', msg, err);
        }
      },
    };
  }

  private async parseEmail(message: any): Promise<EmailData | null> {
    try {
      // Convert buffer to string for parsing
      const emailSource = message.source ? message.source.toString() : '';

      // Basic email parsing - extract key fields
      const subject = message.envelope?.subject || '(No Subject)';
      const from = this.parseEmailAddress(message.envelope?.from);
      const date = message.internalDate ? new Date(message.internalDate) : new Date();

      // Extract body content - this is a simplified version
      // In a real implementation, you'd want to parse MIME content properly
      const body = this.parseEmailBody(emailSource) || emailSource.substring(0, 1000);

      return {
        id: message.uid.toString(),
        subject: subject,
        body: body,
        from: from,
        date: date
      };
    } catch (error) {
      console.error('Error parsing email:', error);
      return null;
    }
  }

  private parseEmailAddress(addresses: any): string {
    if (!addresses || !Array.isArray(addresses)) {
      return 'Unknown Sender';
    }

    const address = addresses[0];
    if (address?.address) {
      // Return "Name <email>" format if name is available, otherwise just email
      if (address.name) {
        return `${address.name} <${address.address}>`;
      }
      return address.address;
    }

    return 'Unknown Sender';
  }

  private parseEmailBody(emailSource: string): string | null {
    try {
      // Simple body extraction - looks for text/plain content
      const lines = emailSource.split('\n');
      let bodyStart = false;
      let bodyLines: string[] = [];

      for (const line of lines) {
        if (line.trim() === '') {
          bodyStart = true;
          continue;
        }

        if (bodyStart && !line.startsWith('Content-')) {
          bodyLines.push(line);
        }
      }

      return bodyLines.join('\n').trim();
    } catch (error) {
      console.error('Error extracting body:', error);
      return null;
    }
  }

  async testConnection(config: MailConnectionConfig): Promise<TestConnectionResult> {
    try {
      const ImapFlowClass = await this.getImapFlow();
      const clientOptions: Record<string, unknown> = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
      };

      // Add TLS options if allowing unsigned certificates
      if (config.allowUnsignedCertificate) {
        clientOptions.tls = {
          rejectUnauthorized: false,
        };
        clientOptions.ignoreTLS = true;
      }

      const client = new ImapFlowClass({
        ...clientOptions,
        logger: this.createSilentLogger(),
      });

      await client.connect();
      await client.logout();
      return { success: true };
    } catch (error) {
      // Only log non-network errors
      const errorMsg = String((error as { message?: unknown })?.message || '');
      const isNetworkError = [
        'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN',
        'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
        'socket hang up', 'Connection closed', 'read ETIMEDOUT'
      ].some((code) => errorMsg.includes(code) || (error as { code?: string })?.code === code);

      if (!isNetworkError) {
        console.error('IMAP connection test failed:', error);
      }

      // Extract meaningful error message from ImapFlow error
      let errorMessage = 'Connection failed';
      if ((error as { response?: string })?.response) {
        errorMessage = (error as { response: string }).response;
      } else if ((error as { message?: string })?.message) {
        errorMessage = (error as { message: string }).message;
      } else if ((error as { responseText?: string })?.responseText) {
        errorMessage = (error as { responseText: string }).responseText;
      }

      return { success: false, error: errorMessage };
    }
  }

  async fetchEmails(config: MailConnectionConfig, maxAgeDays: number): Promise<FetchEmailsResult> {
    try {
      // Safety fallback for undefined maxAgeDays
      const safeMaxAgeDays = maxAgeDays || 1;

      const ImapFlowClass = await this.getImapFlow();
      const clientOptions: Record<string, unknown> = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
      };

      // Add TLS options if allowing unsigned certificates
      if (config.allowUnsignedCertificate) {
        clientOptions.tls = {
          rejectUnauthorized: false,
        };
        clientOptions.ignoreTLS = true;
      }

      const client = new ImapFlowClass({
        ...clientOptions,
        logger: this.createSilentLogger(),
      });
      await client.connect();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - safeMaxAgeDays);

      // Fetch emails from INBOX within the date range
      const messages: EmailData[] = [];

      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch({ since: startDate }, {
          uid: true,
          envelope: true,
          source: true,
          bodyStructure: true,
          internalDate: true,
        })) {
          // Parse the email
          const email = await this.parseEmail(msg);
          if (email) {
            messages.push(email);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
      return { success: true, emails: messages };
    } catch (error) {
      // Only log non-network errors
      const errorMsg = String((error as { message?: unknown })?.message || '');
      const isNetworkError = [
        'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN',
        'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
        'socket hang up', 'Connection closed', 'read ETIMEDOUT'
      ].some((code) => errorMsg.includes(code) || (error as { code?: string })?.code === code);

      if (!isNetworkError) {
        console.error('Failed to fetch emails:', error);
      }
      let errorMessage = 'Failed to fetch emails';
      if ((error as { response?: string })?.response) {
        errorMessage = (error as { response: string }).response;
      } else if ((error as { message?: string })?.message) {
        errorMessage = (error as { message: string }).message;
      }
      return { success: false, error: errorMessage };
    }
  }

  async moveEmailToSpam(config: MailConnectionConfig, emailId: string): Promise<MoveEmailResult> {
    try {
      const ImapFlowClass = await this.getImapFlow();
      const clientOptions: Record<string, unknown> = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
      };

      // Add TLS options if allowing unsigned certificates
      if (config.allowUnsignedCertificate) {
        clientOptions.tls = {
          rejectUnauthorized: false,
        };
        clientOptions.ignoreTLS = true;
      }

      const client = new ImapFlowClass({
        ...clientOptions,
        logger: this.createSilentLogger(),
      });
      await client.connect();

      // Select INBOX first (required for moving messages)
      const lock = await client.getMailboxLock('INBOX');

      // Move email to spam folder
      const spamFolder = config.spamFolder || 'Spam';
      let moved = false;

      try {
        // Try UID-based move first
        try {
          await client.messageMove({ uid: emailId }, spamFolder);
          moved = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (uidError) {
          // Fallback to sequence number
          await client.messageMove(emailId, spamFolder);
          moved = true;
        }
      } catch (moveError) {
        console.log(`Failed to move to ${spamFolder}:`, (moveError as { message?: string })?.message);
        // Fallback to other common spam folders if specified folder fails
        const fallbackFolders = ['Spam', 'Junk', 'Spam Folder', 'Junk E-mail'].filter((f) => f !== spamFolder);
        for (const folderName of fallbackFolders) {
          try {
            await client.messageMove({ uid: emailId }, folderName);
            moved = true;
            break;
          } catch (fallbackError) {
            console.log(`Failed to move to ${folderName}:`, (fallbackError as { message?: string })?.message);
          }
        }
      }

      lock.release();
      await client.logout();
      return { success: moved };
    } catch (error) {
      // Only log non-network errors
      const errorMsg = String((error as { message?: unknown })?.message || '');
      const isNetworkError = [
        'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN',
        'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
        'socket hang up', 'Connection closed', 'read ETIMEDOUT'
      ].some((code) => errorMsg.includes(code) || (error as { code?: string })?.code === code);

      if (!isNetworkError) {
        console.error('Failed to move email to spam:', error);
      }
      let errorMessage = 'Failed to move email to spam';
      if ((error as { response?: string })?.response) {
        errorMessage = (error as { response: string }).response;
      } else if ((error as { message?: string })?.message) {
        errorMessage = (error as { message: string }).message;
      }
      return { success: false, error: errorMessage };
    }
  }

  async getMailFolders(config: MailConnectionConfig): Promise<{ name: string; id: string }[]> {
    try {
      const ImapFlowClass = await this.getImapFlow();
      const clientOptions: Record<string, unknown> = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
      };

      // Add TLS options if allowing unsigned certificates
      if (config.allowUnsignedCertificate) {
        clientOptions.tls = {
          rejectUnauthorized: false,
        };
        clientOptions.ignoreTLS = true;
      }

      const client = new ImapFlowClass({
        ...clientOptions,
        logger: this.createSilentLogger(),
      });
      await client.connect();

      const mailboxList = await client.list();
      const mailboxes = mailboxList.map((mailbox: { path: string }) => ({
        name: mailbox.path.startsWith('INBOX.') ? mailbox.path.substring(6) : mailbox.path,
        path: mailbox.path,
      }));

      await client.logout();
      return mailboxes;
    } catch (error) {
      // Only log non-network errors
      const errorMsg = String((error as { message?: unknown })?.message || '');
      const isNetworkError = [
        'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN',
        'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
        'socket hang up', 'Connection closed', 'read ETIMEDOUT'
      ].some((code) => errorMsg.includes(code) || (error as { code?: string })?.code === code);

      if (!isNetworkError) {
        console.error('Failed to list mailboxes:', error);
      }
      let errorMessage = 'Failed to list mailboxes';
      if ((error as { response?: string })?.response) {
        errorMessage = (error as { response: string }).response;
      } else if ((error as { message?: string })?.message) {
        errorMessage = (error as { message: string }).message;
      }
      throw new Error(errorMessage);
    }
  }
}
