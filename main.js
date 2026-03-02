const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        // Em desenvolvimento, carrega a URL do servidor local do Next.js
        win.loadURL('http://localhost:3000');
        // Abre o DevTools automaticamente
        win.webContents.openDevTools();
    } else {
        // No modo de produção, carrega os arquivos estáticos gerados na pasta 'out'
        win.loadFile(path.join(__dirname, 'out/index.html'));
    }
}

app.whenReady().then(() => {
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
