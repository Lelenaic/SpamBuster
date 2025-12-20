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

app.on("ready", () => {
    createWindow();
});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin"){
        app.quit();
    }
});
