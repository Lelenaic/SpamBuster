// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

function exposeAiAPI() {
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
  });
}

module.exports = { exposeAiAPI };
