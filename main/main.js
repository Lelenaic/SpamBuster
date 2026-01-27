// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain, shell } = require("electron");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serve = require("electron-serve").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RulesManager } = require("./rulesManager");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AccountsManager } = require("./accountsManager");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AIManager } = require("./aiManager");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VectorDBManager } = require("./vectorDBManager");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPackageInfo } = require("./packageJson");

let store;
let rulesManager;
let accountsManager;
let aiManager;
let vectorDBManager;
let mainWindow;
let wizardWindow;  // Add reference to wizard window
let cronJob = null;
let isQuitting = false;
let isSetupCronJobRunning = false; // Mutex to prevent concurrent cron setup

async function initStore() {
  const { default: Store } = await import('electron-store');
  store = new Store();
  rulesManager = new RulesManager(store);
  accountsManager = new AccountsManager(store);
  aiManager = new AIManager(store);
  vectorDBManager = new VectorDBManager(store);

  // Register IPC handlers
  rulesManager.registerHandlers(ipcMain);
  accountsManager.registerHandlers(ipcMain);
  aiManager.registerHandlers(ipcMain);
}

async function setupCronJob() {
  // Prevent concurrent calls
  if (isSetupCronJobRunning) {
    return;
  }
  isSetupCronJobRunning = true;
  
  try {
    // Stop existing cron job if it exists
    if (cronJob && typeof cronJob.stop === 'function') {
      cronJob.stop();
      cronJob = null;
    }

    if (!aiManager) {
      return;
    }

    const enableCron = aiManager.getEnableCron();
    const cronExpression = aiManager.getCronExpression();
    
    if (enableCron && cronExpression) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CronJob } = require('cron');
        cronJob = new CronJob(cronExpression, () => {
          // Trigger email processing
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('trigger-email-processing');
          }
        });
        cronJob.start();
      } catch (error) {
        console.error('Failed to setup cron job:', error);
      }
    }
  } finally {
    isSetupCronJobRunning = false;
  }
}

async function initializeApp() {
  await initStore();
  await setupCronJob();

  // Override the ai manager handlers to also update cron job
  const originalSetEnableCron = aiManager.setEnableCron.bind(aiManager);
  aiManager.setEnableCron = async (value) => {
    originalSetEnableCron(value);
    await setupCronJob();
  };

  const originalSetCronExpression = aiManager.setCronExpression.bind(aiManager);
  aiManager.setCronExpression = async (value) => {
    originalSetCronExpression(value);
    await setupCronJob();
  };

  // Override setSelectedEmbedModel to also update vector DB dimension
  const originalSetSelectedEmbedModel = aiManager.setSelectedEmbedModel.bind(aiManager);
  aiManager.setSelectedEmbedModel = async (value) => {
    originalSetSelectedEmbedModel(value);
    if (vectorDBManager) {
      await vectorDBManager.updateEmbeddingModel(value);
    }
  };
}

initializeApp();

ipcMain.handle('store:get', async (event, key) => {
  if (!store) throw new Error('Store not initialized');
  return store.get(key);
});

ipcMain.handle('store:set', async (event, key, value) => {
  if (!store) throw new Error('Store not initialized');
  return store.set(key, value);
});


ipcMain.handle('package:get-info', async () => {
  return getPackageInfo();
});

// Handle opening external URLs in the default browser
ipcMain.handle('shell:openExternal', async (event, url) => {
  return shell.openExternal(url);
});

ipcMain.handle('trigger-email-processing', async () => {
  // This will be called by the cron job to trigger processing
  // We need to send a message to the renderer to start processing
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('trigger-email-processing');
  }
});

// VectorDB handlers
ipcMain.handle('vectorDB:findSimilarEmails', async (event, queryText, limit, accountId) => {
  if (!vectorDBManager) throw new Error('VectorDB not initialized');
  return await vectorDBManager.findSimilarEmails(queryText, limit, accountId);
});

ipcMain.handle('vectorDB:storeAnalyzedEmail', async (event, emailData) => {
  if (!vectorDBManager) throw new Error('VectorDB not initialized');
  return await vectorDBManager.storeAnalyzedEmail(emailData);
});

ipcMain.handle('vectorDB:getEmailCount', async () => {
  if (!vectorDBManager) throw new Error('VectorDB not initialized');
  return await vectorDBManager.getEmailCount();
});

ipcMain.handle('vectorDB:updateUserValidation', async (event, emailId, userValidated) => {
  if (!vectorDBManager) throw new Error('VectorDB not initialized');
  return await vectorDBManager.updateUserValidation(emailId, userValidated);
});

ipcMain.handle('vectorDB:clearAllEmails', async () => {
  if (!vectorDBManager) throw new Error('VectorDB not initialized');
  return await vectorDBManager.clearAllEmails();
});

ipcMain.on('open-wizard-window', () => {
  createWizardWindow();
});

ipcMain.on('wizard-closed', () => {
  if (wizardWindow) {
    wizardWindow.close();
    wizardWindow = null;
  }
  // Notify main window to refresh accounts list
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('accounts-refresh-needed');
  }
});

// Also listen for accounts-refresh-needed from wizard and forward it
ipcMain.on('accounts-refresh-needed', () => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('accounts-refresh-needed');
  }
});

// Processing events - forward events from main to renderer
// These handlers receive events from the main thread and forward to the renderer
ipcMain.on('processing:stats-update', (event, data) => {
  event.sender.send('processing:stats-update', data);
});

ipcMain.on('processing:progress', (event, data) => {
  event.sender.send('processing:progress', data);
});

ipcMain.on('processing:complete', (event, data) => {
  event.sender.send('processing:complete', data);
});

ipcMain.on('processing:error', (event, error) => {
  event.sender.send('processing:error', error);
});

ipcMain.on('processing:status-change', (event, status) => {
  event.sender.send('processing:status-change', status);
});

const appServe = app.isPackaged ? serve({
  directory: path.join(__dirname, "../out")
}) : null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 730,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    }
  });

  // Hide the window instead of closing when clicking the close button
  mainWindow.on('close', (event) => {
    console.log('Window close event triggered, isQuitting:', isQuitting);
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (app.isPackaged) {
    if (appServe) {
      appServe(mainWindow);
    }
  } else {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.on("did-fail-load", () => {
      mainWindow.webContents.reloadIgnoringCache();
    });
  }
}

const createWizardWindow = () => {
  if (wizardWindow) {
    wizardWindow.focus();
    return;
  }
  
  wizardWindow = new BrowserWindow({
    width: 1250,
    height: 940,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  wizardWindow.on('closed', () => {
    wizardWindow = null;
  });

  if (app.isPackaged) {
    if (appServe) {
      // Set up the protocol handler first
      appServe(wizardWindow);
      // Then load the wizard page using the app:// protocol
      wizardWindow.loadURL('app://-/wizard.html');
    }
  } else {
    wizardWindow.loadURL("http://localhost:3000/wizard");
    wizardWindow.webContents.openDevTools();
    wizardWindow.webContents.on("did-fail-load", () => {
      wizardWindow.webContents.reloadIgnoringCache();
    });
  }
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on("ready", () => {
    createWindow();
});

app.on("window-all-closed", () => {
    if (isQuitting) {
      app.quit();
    }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});
