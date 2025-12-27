 
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    send: (channel, args) => {
        ipcRenderer.send(channel, args);
    },
    invoke: (channel, args) => {
        return ipcRenderer.invoke(channel, args);
    }
});

contextBridge.exposeInMainWorld("storeAPI", {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
});

contextBridge.exposeInMainWorld("rulesAPI", {
    getAll: () => ipcRenderer.invoke('rules:getAll'),
    getById: (id) => ipcRenderer.invoke('rules:getById', id),
    create: (ruleData) => ipcRenderer.invoke('rules:create', ruleData),
    update: (id, updates) => ipcRenderer.invoke('rules:update', id, updates),
    delete: (id) => ipcRenderer.invoke('rules:delete', id),
});

contextBridge.exposeInMainWorld("accountsAPI", {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    getById: (id) => ipcRenderer.invoke('accounts:getById', id),
    create: (accountData) => ipcRenderer.invoke('accounts:create', accountData),
    update: (id, updates) => ipcRenderer.invoke('accounts:update', id, updates),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id),
});

contextBridge.exposeInMainWorld("aiAPI", {
    getAISource: () => ipcRenderer.invoke('ai:getAISource'),
    setAISource: (value) => ipcRenderer.invoke('ai:setAISource', value),
    getOllamaBaseUrl: () => ipcRenderer.invoke('ai:getOllamaBaseUrl'),
    setOllamaBaseUrl: (value) => ipcRenderer.invoke('ai:setOllamaBaseUrl', value),
    getOllamaApiKey: () => ipcRenderer.invoke('ai:getOllamaApiKey'),
    setOllamaApiKey: (value) => ipcRenderer.invoke('ai:setOllamaApiKey', value),
    getOpenRouterApiKey: () => ipcRenderer.invoke('ai:getOpenRouterApiKey'),
    setOpenRouterApiKey: (value) => ipcRenderer.invoke('ai:setOpenRouterApiKey', value),
    getSelectedModel: () => ipcRenderer.invoke('ai:getSelectedModel'),
    setSelectedModel: (value) => ipcRenderer.invoke('ai:setSelectedModel', value),
    getSelectedEmbedModel: () => ipcRenderer.invoke('ai:getSelectedEmbedModel'),
    setSelectedEmbedModel: (value) => ipcRenderer.invoke('ai:setSelectedEmbedModel', value),
    getAISensitivity: () => ipcRenderer.invoke('ai:getAISensitivity'),
    setAISensitivity: (value) => ipcRenderer.invoke('ai:setAISensitivity', value),
});
