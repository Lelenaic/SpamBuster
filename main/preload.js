/* eslint-disable import/no-commonjs */
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
