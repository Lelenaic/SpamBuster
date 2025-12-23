// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain } = require("electron");
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

let store;
let rulesManager;
let accountsManager;
let aiManager;
let mainWindow;

async function initStore() {
  const { default: Store } = await import('electron-store');
  store = new Store();
  rulesManager = new RulesManager(store);
  accountsManager = new AccountsManager(store);
  aiManager = new AIManager(store);
}

initStore();

ipcMain.handle('store:get', async (event, key) => {
  if (!store) throw new Error('Store not initialized');
  return store.get(key);
});

ipcMain.handle('store:set', async (event, key, value) => {
  if (!store) throw new Error('Store not initialized');
  return store.set(key, value);
});

ipcMain.handle('rules:getAll', async () => {
  if (!rulesManager) throw new Error('RulesManager not initialized');
  return rulesManager.getAll();
});

ipcMain.handle('rules:getById', async (event, id) => {
  if (!rulesManager) throw new Error('RulesManager not initialized');
  return rulesManager.getById(id);
});

ipcMain.handle('rules:create', async (event, ruleData) => {
  if (!rulesManager) throw new Error('RulesManager not initialized');
  return rulesManager.create(ruleData);
});

ipcMain.handle('rules:update', async (event, id, updates) => {
  if (!rulesManager) throw new Error('RulesManager not initialized');
  return rulesManager.update(id, updates);
});

ipcMain.handle('rules:delete', async (event, id) => {
  if (!rulesManager) throw new Error('RulesManager not initialized');
  return rulesManager.delete(id);
});

ipcMain.handle('accounts:getAll', async () => {
  if (!accountsManager) throw new Error('AccountsManager not initialized');
  return accountsManager.getAll();
});

ipcMain.handle('accounts:getById', async (event, id) => {
  if (!accountsManager) throw new Error('AccountsManager not initialized');
  return accountsManager.getById(id);
});

ipcMain.handle('accounts:create', async (event, accountData) => {
  if (!accountsManager) throw new Error('AccountsManager not initialized');
  return accountsManager.create(accountData);
});

ipcMain.handle('accounts:update', async (event, id, updates) => {
  if (!accountsManager) throw new Error('AccountsManager not initialized');
  return accountsManager.update(id, updates);
});

ipcMain.handle('accounts:delete', async (event, id) => {
  if (!accountsManager) throw new Error('AccountsManager not initialized');
  return accountsManager.delete(id);
});

ipcMain.handle('ai:getAISource', async () => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.getAISource();
});

ipcMain.handle('ai:setAISource', async (event, value) => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.setAISource(value);
});

ipcMain.handle('ai:getOllamaBaseUrl', async () => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.getOllamaBaseUrl();
});

ipcMain.handle('ai:setOllamaBaseUrl', async (event, value) => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.setOllamaBaseUrl(value);
});

ipcMain.handle('ai:getOllamaApiKey', async () => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.getOllamaApiKey();
});

ipcMain.handle('ai:setOllamaApiKey', async (event, value) => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.setOllamaApiKey(value);
});

ipcMain.handle('ai:getOpenRouterApiKey', async () => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.getOpenRouterApiKey();
});

ipcMain.handle('ai:setOpenRouterApiKey', async (event, value) => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.setOpenRouterApiKey(value);
});

ipcMain.handle('ai:getSelectedModel', async () => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.getSelectedModel();
});

ipcMain.handle('ai:setSelectedModel', async (event, value) => {
  if (!aiManager) throw new Error('AIManager not initialized');
  return aiManager.setSelectedModel(value);
});

ipcMain.on('accounts-updated', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('accounts-updated');
  }
});

let ImapFlow;
async function getImapFlow() {
  if (!ImapFlow) {
    const imapflowModule = await import('imapflow');
    ImapFlow = imapflowModule.ImapFlow;
  }
  return ImapFlow;
}

ipcMain.handle('test-imap-connection', async (event, config) => {
  try {
    const ImapFlowClass = await getImapFlow();
    const clientOptions = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    };

    // Add TLS options if allowing unsigned certificates
    if (config.allowUnsignedCertificate) {
      clientOptions.tls = {
        rejectUnauthorized: false,
      };
      clientOptions.ignoreTLS = true;
    }

    const client = new ImapFlowClass(clientOptions);

    await client.connect();
    await client.logout();
    return { success: true };
  } catch (error) {
    console.error('IMAP connection test failed:', error);

    // Extract meaningful error message from ImapFlow error
    let errorMessage = 'Connection failed';
    if (error.response) {
      errorMessage = error.response;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.responseText) {
      errorMessage = error.responseText;
    }

    return { success: false, error: errorMessage };
  }
});

ipcMain.on('open-wizard-window', () => {
  createWizardWindow();
});

const appServe = app.isPackaged ? serve({
  directory: path.join(__dirname, "../out")
}) : null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 730,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (app.isPackaged) {
    if (appServe) {
      appServe(mainWindow).then(() => {
        console.log('Successfully loaded packaged app');
      }).catch(err => {
        console.error('Error loading packaged app:', err);
      });
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
  const win = new BrowserWindow({
    width: 1250,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (app.isPackaged) {
    if (appServe) {
      appServe(win).then(() => {
        console.log('Successfully loaded packaged wizard app');
      }).catch(err => {
        console.error('Error loading packaged wizard app:', err);
      });
    }
  } else {
    win.loadURL("http://localhost:3000/wizard");
    win.webContents.openDevTools();
    win.webContents.on("did-fail-load", () => {
      win.webContents.reloadIgnoringCache();
    });
  }
}

app.on("ready", () => {
    createWindow();
});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin"){
        app.quit();
    }
});
