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

  getEnableVectorDB() {
    return this.store.get('enableVectorDB', false);
  }

  setEnableVectorDB(value) {
    this.store.set('enableVectorDB', value);
  }

  getCustomizeSpamGuidelines() {
    return this.store.get('customizeSpamGuidelines', false);
  }

  setCustomizeSpamGuidelines(value) {
    this.store.set('customizeSpamGuidelines', value);
  }

  getCustomSpamGuidelines() {
    return this.store.get('customSpamGuidelines', '');
  }

  setCustomSpamGuidelines(value) {
    this.store.set('customSpamGuidelines', value);
  }

  getTemperature() {
    return this.store.get('temperature', 0.1);
  }

  setTemperature(value) {
    this.store.set('temperature', value);
  }

  getTopP() {
    return this.store.get('topP', 0.9);
  }

  setTopP(value) {
    this.store.set('topP', value);
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

    ipcMain.handle('ai:getEnableVectorDB', async () => {
      return this.getEnableVectorDB();
    });

    ipcMain.handle('ai:setEnableVectorDB', async (event, value) => {
      return this.setEnableVectorDB(value);
    });

    ipcMain.handle('ai:getCustomizeSpamGuidelines', async () => {
      return this.getCustomizeSpamGuidelines();
    });

    ipcMain.handle('ai:setCustomizeSpamGuidelines', async (event, value) => {
      return this.setCustomizeSpamGuidelines(value);
    });

    ipcMain.handle('ai:getCustomSpamGuidelines', async () => {
      return this.getCustomSpamGuidelines();
    });

    ipcMain.handle('ai:setCustomSpamGuidelines', async (event, value) => {
      return this.setCustomSpamGuidelines(value);
    });

    ipcMain.handle('ai:getTemperature', async () => {
      return this.getTemperature();
    });

    ipcMain.handle('ai:setTemperature', async (event, value) => {
      return this.setTemperature(value);
    });

    ipcMain.handle('ai:getTopP', async () => {
      return this.getTopP();
    });

    ipcMain.handle('ai:setTopP', async (event, value) => {
      return this.setTopP(value);
    });
  }
}

module.exports = { AIManager };
