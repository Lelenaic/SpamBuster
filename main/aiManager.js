class AIManager {
  constructor(store) {
    this.store = store;
  }

  getAISource() {
    return this.store.get('aiSource', 'ollama');
  }

  setAISource(value) {
    this.store.set('aiSource', value);
  }

  getOllamaBaseUrl() {
    return this.store.get('ollamaBaseUrl', 'http://localhost:11434');
  }

  setOllamaBaseUrl(value) {
    this.store.set('ollamaBaseUrl', value);
  }

  getOllamaApiKey() {
    return this.store.get('ollamaApiKey', '');
  }

  setOllamaApiKey(value) {
    this.store.set('ollamaApiKey', value);
  }

  getOpenRouterApiKey() {
    return this.store.get('openRouterApiKey', '');
  }

  setOpenRouterApiKey(value) {
    this.store.set('openRouterApiKey', value);
  }

  getSelectedModel() {
    return this.store.get('selectedModel', '');
  }

  setSelectedModel(value) {
    this.store.set('selectedModel', value);
  }

  getSelectedEmbedModel() {
    return this.store.get('selectedEmbedModel', '');
  }

  setSelectedEmbedModel(value) {
    this.store.set('selectedEmbedModel', value);
  }

  getAISensitivity() {
    return this.store.get('aiSensitivity', 7);
  }

  setAISensitivity(value) {
    this.store.set('aiSensitivity', value);
  }

  registerHandlers(ipcMain) {
    ipcMain.handle('ai:getAISource', async () => {
      return this.getAISource();
    });

    ipcMain.handle('ai:setAISource', async (event, value) => {
      return this.setAISource(value);
    });

    ipcMain.handle('ai:getOllamaBaseUrl', async () => {
      return this.getOllamaBaseUrl();
    });

    ipcMain.handle('ai:setOllamaBaseUrl', async (event, value) => {
      return this.setOllamaBaseUrl(value);
    });

    ipcMain.handle('ai:getOllamaApiKey', async () => {
      return this.getOllamaApiKey();
    });

    ipcMain.handle('ai:setOllamaApiKey', async (event, value) => {
      return this.setOllamaApiKey(value);
    });

    ipcMain.handle('ai:getOpenRouterApiKey', async () => {
      return this.getOpenRouterApiKey();
    });

    ipcMain.handle('ai:setOpenRouterApiKey', async (event, value) => {
      return this.setOpenRouterApiKey(value);
    });

    ipcMain.handle('ai:getSelectedModel', async () => {
      return this.getSelectedModel();
    });

    ipcMain.handle('ai:setSelectedModel', async (event, value) => {
      return this.setSelectedModel(value);
    });

    ipcMain.handle('ai:getSelectedEmbedModel', async () => {
      return this.getSelectedEmbedModel();
    });

    ipcMain.handle('ai:setSelectedEmbedModel', async (event, value) => {
      return this.setSelectedEmbedModel(value);
    });

    ipcMain.handle('ai:getAISensitivity', async () => {
      return this.getAISensitivity();
    });

    ipcMain.handle('ai:setAISensitivity', async (event, value) => {
      return this.setAISensitivity(value);
    });
  }
}

module.exports = { AIManager };
