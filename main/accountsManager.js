// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require('uuid');

class AccountsManager {
  constructor(store) {
    this.store = store;
  }

  getAll() {
    return this.store.get('accounts', []);
  }

  getById(id) {
    const accounts = this.getAll();
    return accounts.find(a => a.id === id);
  }

  create(accountData) {
    const accounts = this.getAll();
    const newAccount = {
      id: uuidv4(),
      ...accountData
    };
    accounts.push(newAccount);
    this.store.set('accounts', accounts);
    return newAccount;
  }

  update(id, updates) {
    const accounts = this.getAll();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    accounts[index] = { ...accounts[index], ...updates };
    this.store.set('accounts', accounts);
    return accounts[index];
  }

  delete(id) {
    const accounts = this.getAll();
    const filtered = accounts.filter(a => a.id !== id);
    if (filtered.length === accounts.length) return false;
    this.store.set('accounts', filtered);
    return true;
  }

  async getImapFlow() {
    if (!this.ImapFlow) {
      const imapflowModule = await import('imapflow');
      this.ImapFlow = imapflowModule.ImapFlow;
    }
    return this.ImapFlow;
  }

  async parseEmail(message) {
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

  parseEmailAddress(addresses) {
    if (!addresses || !Array.isArray(addresses)) {
      return 'Unknown Sender';
    }
    
    const address = addresses[0];
    if (address?.address) {
      return address.address;
    }
    
    return 'Unknown Sender';
  }

  parseEmailBody(emailSource) {
    try {
      // Simple body extraction - looks for text/plain content
      const lines = emailSource.split('\n');
      let bodyStart = false;
      let bodyLines = [];
      
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

  registerHandlers(ipcMain) {
    ipcMain.handle('accounts:getAll', async () => {
      return this.getAll();
    });

    ipcMain.handle('accounts:getById', async (event, id) => {
      return this.getById(id);
    });

    ipcMain.handle('accounts:create', async (event, accountData) => {
      return this.create(accountData);
    });

    ipcMain.handle('accounts:update', async (event, id, updates) => {
      return this.update(id, updates);
    });

    ipcMain.handle('accounts:delete', async (event, id) => {
      return this.delete(id);
    });

    ipcMain.handle('test-imap-connection', async (event, config) => {
      try {
        const ImapFlowClass = await this.getImapFlow();
        const clientOptions = {
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

        const client = new ImapFlowClass(clientOptions);

        await client.connect();
        await client.logout();
        return { success: true };
      } catch (error) {
        console.error('IMAP connection test failed:', error);

        // Extract meaningful error message from ImapFlow error
        let errorMessage = 'Connection failed';
        if (error.response) {
          errorMessage = error.response;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.responseText) {
          errorMessage = error.responseText;
        }

        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('fetch-emails', async (event, config, maxAgeDays) => {
      try {
        // Safety fallback for undefined maxAgeDays
        const safeMaxAgeDays = maxAgeDays || 7;
        
        const ImapFlowClass = await this.getImapFlow();
        const clientOptions = {
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

        const client = new ImapFlowClass(clientOptions);
        await client.connect();

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - safeMaxAgeDays);

        // Fetch emails from INBOX within the date range
        const messages = [];

        const lock = await client.getMailboxLock('INBOX');
        try {
          for await (let msg of client.fetch({ since: startDate }, {
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
        console.error('Failed to fetch emails:', error);
        let errorMessage = 'Failed to fetch emails';
        if (error.response) {
          errorMessage = error.response;
        } else if (error.message) {
          errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('move-email-to-spam', async (event, config, emailId) => {
      try {
        const ImapFlowClass = await this.getImapFlow();
        const clientOptions = {
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

        const client = new ImapFlowClass(clientOptions);
        await client.connect();

        // Move email to spam folder
        // Try different spam folder names
        const spamFolders = ['Spam', 'Junk', 'Spam Folder', 'Junk E-mail'];
        let moved = false;

        for (const folderName of spamFolders) {
          try {
            await client.messageMove(emailId, folderName);
            moved = true;
            console.log(`Moved email ${emailId} to ${folderName}`);
            break;
          } catch (moveError) {
            console.log(`Failed to move to ${folderName}:`, moveError.message);
          }
        }

        await client.logout();
        return { success: moved };
      } catch (error) {
        console.error('Failed to move email to spam:', error);
        let errorMessage = 'Failed to move email to spam';
        if (error.response) {
          errorMessage = error.response;
        } else if (error.message) {
          errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
      }
    });
  }
}

module.exports = { AccountsManager };
