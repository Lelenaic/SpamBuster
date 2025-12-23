 
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exposeRulesAPI } = require("./rulesPreload");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exposeAccountsAPI } = require("./accountsPreload");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exposeAiAPI } = require("./aiPreload");

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

// Expose manager APIs
exposeRulesAPI();
exposeAccountsAPI();
exposeAiAPI();
