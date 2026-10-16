import path from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { registerCommentsHandlers } from './ipc/comments';
import { registerPipelineHandlers } from './ipc/pipeline';
import { registerReviewHandlers } from './ipc/review';
import { registerTerminalHandlers } from './ipc/terminal';
import { registerTopicsHandlers } from './ipc/topics';
import { registerTrendsHandlers } from './ipc/trends';
import { registerYouTubeAuthHandlers } from './ipc/youtube-auth';

let mainWindow: BrowserWindow | null = null;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function shouldOpenExternally(
  targetUrl: string,
  appUrl: string | undefined,
): boolean {
  if (!isHttpUrl(targetUrl)) {
    return false;
  }

  if (!appUrl) {
    return true;
  }

  try {
    return new URL(targetUrl).origin !== new URL(appUrl).origin;
  } catch {
    return true;
  }
}

function openExternalUrl(url: string): Promise<void> {
  return shell.openExternal(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 800,
    title: 'Ship Sh!t Show',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    width: 1400,
  });

  const appUrl = process.env.VITE_DEV_SERVER_URL;

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenExternally(url, appUrl)) {
      void openExternalUrl(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!shouldOpenExternally(url, appUrl)) {
      return;
    }

    event.preventDefault();
    void openExternalUrl(url);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerTerminalHandlers();
  registerTopicsHandlers();
  registerTrendsHandlers();
  registerPipelineHandlers();
  registerReviewHandlers();
  registerCommentsHandlers();
  registerYouTubeAuthHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
