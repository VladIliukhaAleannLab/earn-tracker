interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (...args: any[]) => void) => () => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}

interface Window {
  electron: ElectronAPI;
}
