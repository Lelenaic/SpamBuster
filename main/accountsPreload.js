// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

function exposeAccountsAPI() {
  contextBridge.exposeInMainWorld("accountsAPI", {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getById: (id) => ipcRenderer.invoke('accounts:getById', id),
    create: (accountData) => ipcRenderer.invoke('accounts:create', accountData),
    update: (id, updates) => ipcRenderer.invoke('accounts:update', id, updates),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id),
    testImapConnection: (config) => ipcRenderer.invoke('test-imap-connection', config),
  });
}

module.exports = { exposeAccountsAPI };
