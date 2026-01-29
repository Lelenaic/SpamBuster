class GeneralSettingsManager {
  constructor(store) {
    this.store = store;
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
    
    if (!validation.valid) {
      // Fallback to default if validation fails
      return '* * * * *';
    }
    
    return cronExpression;
  }

  validateCronExpression(expression) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateCronExpression } = require('cron');
      const validation = validateCronExpression(expression);
      // Return in a format compatible with the frontend expected format
      return { valid: validation.valid, isValid: validation.valid };
    } catch (error) {
      return { valid: false, isValid: false, error: error.message };
    }
  }

  getDateFormat() {
    return this.store.get('dateFormat', 'iso');
  }

  setDateFormat(value) {
    this.store.set('dateFormat', value);
  }

  getCustomDateFormat() {
    return this.store.get('customDateFormat', '{YYYY}-{MM}-{DD}');
  }

  setCustomDateFormat(value) {
    this.store.set('customDateFormat', value);
  }

  getTimeFormat() {
    return this.store.get('timeFormat', '24h'); // '12h' or '24h'
  }

  setTimeFormat(value) {
    this.store.set('timeFormat', value);
  }

  registerHandlers(ipcMain) {
    ipcMain.handle('general:getAISensitivity', async () => {
      return this.getAISensitivity();
    });

    ipcMain.handle('general:setAISensitivity', async (event, value) => {
      return this.setAISensitivity(value);
    });

    ipcMain.handle('general:getEmailAgeDays', async () => {
      return this.getEmailAgeDays();
    });

    ipcMain.handle('general:setEmailAgeDays', async (event, value) => {
      return this.setEmailAgeDays(value);
    });

    ipcMain.handle('general:getSimplifyEmailContent', async () => {
      return this.getSimplifyEmailContent();
    });

    ipcMain.handle('general:setSimplifyEmailContent', async (event, value) => {
      return this.setSimplifyEmailContent(value);
    });

    ipcMain.handle('general:getSimplifyEmailContentMode', async () => {
      return this.getSimplifyEmailContentMode();
    });

    ipcMain.handle('general:setSimplifyEmailContentMode', async (event, value) => {
      return this.setSimplifyEmailContentMode(value);
    });

    ipcMain.handle('general:getEnableCron', async () => {
      return this.getEnableCron();
    });

    ipcMain.handle('general:setEnableCron', async (event, value) => {
      return this.setEnableCron(value);
    });

    ipcMain.handle('general:getCronExpression', async () => {
      return this.getCronExpression();
    });

    ipcMain.handle('general:setCronExpression', async (event, value) => {
      return this.setCronExpression(value);
    });

    ipcMain.handle('general:validateCronExpression', async (event, expression) => {
      return this.validateCronExpression(expression);
    });

    ipcMain.handle('general:getSchedulerMode', async () => {
      return this.getSchedulerMode();
    });

    ipcMain.handle('general:setSchedulerMode', async (event, value) => {
      return this.setSchedulerMode(value);
    });

    ipcMain.handle('general:getSchedulerSimpleValue', async () => {
      return this.getSchedulerSimpleValue();
    });

    ipcMain.handle('general:setSchedulerSimpleValue', async (event, value) => {
      return this.setSchedulerSimpleValue(value);
    });

    ipcMain.handle('general:getSchedulerSimpleUnit', async () => {
      return this.getSchedulerSimpleUnit();
    });

    ipcMain.handle('general:setSchedulerSimpleUnit', async (event, value) => {
      return this.setSchedulerSimpleUnit(value);
    });

    ipcMain.handle('general:generateCronFromSimple', async (event, value, unit) => {
      return this.generateCronFromSimple(value, unit);
    });

    ipcMain.handle('general:getDateFormat', async () => {
      return this.getDateFormat();
    });

    ipcMain.handle('general:setDateFormat', async (event, value) => {
      return this.setDateFormat(value);
    });

    ipcMain.handle('general:getCustomDateFormat', async () => {
      return this.getCustomDateFormat();
    });

    ipcMain.handle('general:setCustomDateFormat', async (event, value) => {
      return this.setCustomDateFormat(value);
    });

    ipcMain.handle('general:getTimeFormat', async () => {
      return this.getTimeFormat();
    });

    ipcMain.handle('general:setTimeFormat', async (event, value) => {
      return this.setTimeFormat(value);
    });
  }
}

module.exports = { GeneralSettingsManager };
