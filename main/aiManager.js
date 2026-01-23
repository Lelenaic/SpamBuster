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

  getEmailAgeDays() {
    return this.store.get('emailAgeDays', 1);
  }

  setEmailAgeDays(value) {
    this.store.set('emailAgeDays', value);
  }

  getSimplifyEmailContent() {
    return this.store.get('simplifyEmailContent', true);
  }

  setSimplifyEmailContent(value) {
    this.store.set('simplifyEmailContent', value);
  }

  getEnableCron() {
    return this.store.get('enableCron', true);
  }

  setEnableCron(value) {
    this.store.set('enableCron', value);
  }

  getCronExpression() {
    return this.store.get('cronExpression', '* * * * *');
  }

  setCronExpression(value) {
    this.store.set('cronExpression', value);
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

  validateCronExpression(expression) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateCronExpression } = require('cron');
      const validation = validateCronExpression(expression);
      return validation;
    } catch (error) {
      return { valid: false, error: error.message };
    }
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

    ipcMain.handle('ai:getEmailAgeDays', async () => {
      return this.getEmailAgeDays();
    });

    ipcMain.handle('ai:setEmailAgeDays', async (event, value) => {
      return this.setEmailAgeDays(value);
    });

    ipcMain.handle('ai:getSimplifyEmailContent', async () => {
      return this.getSimplifyEmailContent();
    });

    ipcMain.handle('ai:setSimplifyEmailContent', async (event, value) => {
      return this.setSimplifyEmailContent(value);
    });

    ipcMain.handle('ai:getEnableCron', async () => {
      return this.getEnableCron();
    });

    ipcMain.handle('ai:setEnableCron', async (event, value) => {
      return this.setEnableCron(value);
    });

    ipcMain.handle('ai:getCronExpression', async () => {
      return this.getCronExpression();
    });

    ipcMain.handle('ai:setCronExpression', async (event, value) => {
      return this.setCronExpression(value);
    });

    ipcMain.handle('ai:validateCronExpression', async (event, expression) => {
      return this.validateCronExpression(expression);
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
  }
}

module.exports = { AIManager };
