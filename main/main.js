const { app, BrowserWindow, ipcMain } = require("electron");
const serve = require("electron-serve").default;
const path = require("path");

let store;

async function initStore() {
  const { default: Store } = await import('electron-store');
  store = new Store();
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
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (app.isPackaged) {
    if (appServe) {
      appServe(win).then(() => {
        console.log('Successfully loaded packaged app');
      }).catch(err => {
        console.error('Error loading packaged app:', err);
      });
    }
  } else {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
    win.webContents.on("did-fail-load", (e, code, desc) => {
      win.webContents.reloadIgnoringCache();
    });
  }
}

const createWizardWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
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
    win.webContents.on("did-fail-load", (e, code, desc) => {
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
