// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    send: (channel, args) => {
        ipcRenderer.send(channel, args);
    },
    invoke: (channel, ...args) => {
        return ipcRenderer.invoke(channel, ...args);
    }
});

contextBridge.exposeInMainWorld("storeAPI", {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
});

contextBridge.exposeInMainWorld("packageAPI", {
    getInfo: () => ipcRenderer.invoke('package:get-info'),
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
    listMailboxFolders: (config) => ipcRenderer.invoke('list-mailbox-folders', config),
});

contextBridge.exposeInMainWorld("analyzedEmailsAPI", {
    getAll: () => ipcRenderer.invoke('analyzedEmails:getAll'),
    getById: (id) => ipcRenderer.invoke('analyzedEmails:getById', id),
    create: (emailData) => ipcRenderer.invoke('analyzedEmails:create', emailData),
    update: (id, updates) => ipcRenderer.invoke('analyzedEmails:update', id, updates),
    delete: (id) => ipcRenderer.invoke('analyzedEmails:delete', id),
});

contextBridge.exposeInMainWorld("aiAPI", {
    getAISource: () => ipcRenderer.invoke('ai:getAISource'),
    setAISource: (value) => ipcRenderer.invoke('ai:setAISource', value),
    getOllamaBaseUrl: () => ipcRenderer.invoke('ai:getOllamaBaseUrl'),
    setOllamaBaseUrl: (value) => ipcRenderer.invoke('ai:setOllamaBaseUrl', value),
    getOpenRouterApiKey: () => ipcRenderer.invoke('ai:getOpenRouterApiKey'),
    setOpenRouterApiKey: (value) => ipcRenderer.invoke('ai:setOpenRouterApiKey', value),
    getSelectedModel: () => ipcRenderer.invoke('ai:getSelectedModel'),
    setSelectedModel: (value) => ipcRenderer.invoke('ai:setSelectedModel', value),
    getSelectedEmbedModel: () => ipcRenderer.invoke('ai:getSelectedEmbedModel'),
    setSelectedEmbedModel: (value) => ipcRenderer.invoke('ai:setSelectedEmbedModel', value),
    getAISensitivity: () => ipcRenderer.invoke('ai:getAISensitivity'),
    setAISensitivity: (value) => ipcRenderer.invoke('ai:setAISensitivity', value),
    getEmailAgeDays: () => ipcRenderer.invoke('ai:getEmailAgeDays'),
    setEmailAgeDays: (value) => ipcRenderer.invoke('ai:setEmailAgeDays', value),
    getSimplifyEmailContent: () => ipcRenderer.invoke('ai:getSimplifyEmailContent'),
    setSimplifyEmailContent: (value) => ipcRenderer.invoke('ai:setSimplifyEmailContent', value),
    getSimplifyEmailContentMode: () => ipcRenderer.invoke('ai:getSimplifyEmailContentMode'),
    setSimplifyEmailContentMode: (value) => ipcRenderer.invoke('ai:setSimplifyEmailContentMode', value),
    getEnableCron: () => ipcRenderer.invoke('ai:getEnableCron'),
    setEnableCron: (value) => ipcRenderer.invoke('ai:setEnableCron', value),
    getCronExpression: () => ipcRenderer.invoke('ai:getCronExpression'),
    setCronExpression: (value) => ipcRenderer.invoke('ai:setCronExpression', value),
    validateCronExpression: (expression) => ipcRenderer.invoke('ai:validateCronExpression', expression),
    getSchedulerMode: () => ipcRenderer.invoke('ai:getSchedulerMode'),
    setSchedulerMode: (value) => ipcRenderer.invoke('ai:setSchedulerMode', value),
    getSchedulerSimpleValue: () => ipcRenderer.invoke('ai:getSchedulerSimpleValue'),
    setSchedulerSimpleValue: (value) => ipcRenderer.invoke('ai:setSchedulerSimpleValue', value),
    getSchedulerSimpleUnit: () => ipcRenderer.invoke('ai:getSchedulerSimpleUnit'),
    setSchedulerSimpleUnit: (value) => ipcRenderer.invoke('ai:setSchedulerSimpleUnit', value),
    generateCronFromSimple: (value, unit) => ipcRenderer.invoke('ai:generateCronFromSimple', value, unit),
    getEnableVectorDB: () => ipcRenderer.invoke('ai:getEnableVectorDB'),
    setEnableVectorDB: (value) => ipcRenderer.invoke('ai:setEnableVectorDB', value),
    getCustomizeSpamGuidelines: () => ipcRenderer.invoke('ai:getCustomizeSpamGuidelines'),
    setCustomizeSpamGuidelines: (value) => ipcRenderer.invoke('ai:setCustomizeSpamGuidelines', value),
    getCustomSpamGuidelines: () => ipcRenderer.invoke('ai:getCustomSpamGuidelines'),
    setCustomSpamGuidelines: (value) => ipcRenderer.invoke('ai:setCustomSpamGuidelines', value),
});

contextBridge.exposeInMainWorld("vectorDBAPI", {
    findSimilarEmails: (queryText, limit, accountId) => ipcRenderer.invoke('vectorDB:findSimilarEmails', queryText, limit, accountId),
    storeAnalyzedEmail: (emailData) => ipcRenderer.invoke('vectorDB:storeAnalyzedEmail', emailData),
    updateUserValidation: (emailId, userValidated) => ipcRenderer.invoke('vectorDB:updateUserValidation', emailId, userValidated),
    getEmailCount: () => ipcRenderer.invoke('vectorDB:getEmailCount'),
    clearAllEmails: () => ipcRenderer.invoke('vectorDB:clearAllEmails'),
});

contextBridge.exposeInMainWorld("shellAPI", {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});

// Processing events API for real-time status updates
contextBridge.exposeInMainWorld("processingEvents", {
    onStatsUpdate: (callback) => {
        ipcRenderer.on('processing:stats-update', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('processing:stats-update', callback);
    },
    onProgress: (callback) => {
        ipcRenderer.on('processing:progress', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('processing:progress', callback);
    },
    onComplete: (callback) => {
        ipcRenderer.on('processing:complete', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('processing:complete', callback);
    },
    onError: (callback) => {
        ipcRenderer.on('processing:error', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('processing:error', callback);
    },
    onStatusChange: (callback) => {
        ipcRenderer.on('processing:status-change', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('processing:status-change', callback);
    },
    onAnalyzedEmailCreated: (callback) => {
        ipcRenderer.on('analyzed-email-created', (event, ...args) => callback(...args));
        return () => ipcRenderer.removeListener('analyzed-email-created', callback);
    },
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
