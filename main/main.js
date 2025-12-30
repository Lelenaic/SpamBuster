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
const { getPackageInfo } = require("./packageJson");

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

  // Register IPC handlers
  rulesManager.registerHandlers(ipcMain);
  accountsManager.registerHandlers(ipcMain);
  aiManager.registerHandlers(ipcMain);
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


ipcMain.handle('package:get-info', async () => {
  return getPackageInfo();
});

// Handle opening external URLs in the default browser
ipcMain.handle('shell:openExternal', async (event, url) => {
  return shell.openExternal(url);
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
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
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
    height: 940,
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
