// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

function exposeRulesAPI() {
  contextBridge.exposeInMainWorld("rulesAPI", {
    getAll: () => ipcRenderer.invoke('rules:getAll'),
    getById: (id) => ipcRenderer.invoke('rules:getById', id),
    create: (ruleData) => ipcRenderer.invoke('rules:create', ruleData),
    update: (id, updates) => ipcRenderer.invoke('rules:update', id, updates),
    delete: (id) => ipcRenderer.invoke('rules:delete', id),
  });
}

module.exports = { exposeRulesAPI };
