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

  getSimplifyEmailContentMode() {
    return this.store.get('simplifyEmailContentMode', 'aggressive');
  }

  setSimplifyEmailContentMode(value) {
    this.store.set('simplifyEmailContentMode', value);
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

  getSchedulerMode() {
    return this.store.get('schedulerMode', 'simple');
  }

  setSchedulerMode(value) {
    this.store.set('schedulerMode', value);
  }

  getSchedulerSimpleValue() {
    return this.store.get('schedulerSimpleValue', 1);
  }

  setSchedulerSimpleValue(value) {
    this.store.set('schedulerSimpleValue', value);
  }

  getSchedulerSimpleUnit() {
    return this.store.get('schedulerSimpleUnit', 'minutes');
  }

  setSchedulerSimpleUnit(value) {
    this.store.set('schedulerSimpleUnit', value);
  }

  /**
   * Generate a cron expression from simple scheduling inputs
   * @param {number} value - The interval value (e.g., 5 for every 5 minutes)
   * @param {string} unit - The unit ('minutes' or 'hours')
   * @returns {string} A valid cron expression
   */
  generateCronFromSimple(value, unit) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateCronExpression } = require('cron');
    
    const interval = parseInt(value.toString(), 10);
    let cronExpression = '';
    
    if (unit === 'minutes') {
      // Every X minutes: */X * * * *
      // If interval is 1, use * * * * * (every minute)
      if (interval === 1) {
        cronExpression = '* * * * *';
      } else {
        cronExpression = `*/${interval} * * * *`;
      }
    } else {
      // Every X hours: 0 */X * * *
      // If interval is 1, use 0 * * * * (every hour at minute 0)
      if (interval === 1) {
        cronExpression = '0 * * * *';
      } else {
        cronExpression = `0 */${interval} * * *`;
      }
    }
    
    // Validate the generated expression
    const validation = validateCronExpression(cronExpression);
    if (!validation.isValid) {
      // Fallback to default if validation fails
      return '* * * * *';
    }
    
    return cronExpression;
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

    ipcMain.handle('ai:getSimplifyEmailContentMode', async () => {
      return this.getSimplifyEmailContentMode();
    });

    ipcMain.handle('ai:setSimplifyEmailContentMode', async (event, value) => {
      return this.setSimplifyEmailContentMode(value);
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

    ipcMain.handle('ai:getSchedulerMode', async () => {
      return this.getSchedulerMode();
    });

    ipcMain.handle('ai:setSchedulerMode', async (event, value) => {
      return this.setSchedulerMode(value);
    });

    ipcMain.handle('ai:getSchedulerSimpleValue', async () => {
      return this.getSchedulerSimpleValue();
    });

    ipcMain.handle('ai:setSchedulerSimpleValue', async (event, value) => {
      return this.setSchedulerSimpleValue(value);
    });

    ipcMain.handle('ai:getSchedulerSimpleUnit', async () => {
      return this.getSchedulerSimpleUnit();
    });

    ipcMain.handle('ai:setSchedulerSimpleUnit', async (event, value) => {
      return this.setSchedulerSimpleUnit(value);
    });

    ipcMain.handle('ai:generateCronFromSimple', async (event, value, unit) => {
      return this.generateCronFromSimple(value, unit);
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
