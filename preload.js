const { contextBridge } = require('electron');

// Exponha APIs seguras do Node.js ou módulos do Electron para o frontend (Next.js) aqui
contextBridge.exposeInMainWorld('electronAPI', {
    // Exemplo de como enviar/receber dados:
    // ping: () => ipcRenderer.invoke('ping')
});
