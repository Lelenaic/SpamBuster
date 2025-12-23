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
  }
}

module.exports = { AccountsManager };
