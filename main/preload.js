/* eslint-disable import/no-commonjs */
const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");

const store = new Store();

contextBridge.exposeInMainWorld("store", {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
});

contextBridge.exposeInMainWorld("electronAPI", {
    on: (channel, callback) => {
        ipcRenderer.on(channel, callback);
    },
    send: (channel, args) => {
        ipcRenderer.send(channel, args);
    }
});
