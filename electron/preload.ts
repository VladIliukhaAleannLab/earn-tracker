import { contextBridge, ipcRenderer } from 'electron';

// Експортуємо API для використання в рендерері
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args);
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => listener(...args));
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    invoke: (channel: string, ...args: any[]) => {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
});
