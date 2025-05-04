import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { setupDatabase } from './database';
import { createTRPCServer } from './trpc';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Ініціалізація бази даних
  await setupDatabase();

  // Створення вікна
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Завантаження URL
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Відкриття DevTools у режимі розробки
  // Завжди відкриваємо DevTools для діагностики
  mainWindow.webContents.openDevTools();

  // Налаштування tRPC сервера
  createTRPCServer(ipcMain);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
