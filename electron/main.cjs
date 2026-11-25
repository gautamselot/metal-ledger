const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const URL = 'https://mpayroll.vercel.app';
const OFFLINE = 'data:text/html,<body style="font:18px sans-serif;background:%231f2833;color:%23fff;display:grid;place-items:center;height:100vh"><div>No internet. Retrying...</div></body>';

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1400, height: 900, autoHideMenuBar: true, backgroundColor: '#1f2833' });
  win.maximize();
  win.loadURL(URL);

  win.webContents.on('did-fail-load', (_e, _c, _d, _u, isMain) => {
    if (!isMain) return;
    win.loadURL(OFFLINE);
    setTimeout(() => win.loadURL(URL), 5000);
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  let done = false;
  win.on('close', async (e) => {
    if (done) return;
    e.preventDefault();
    try {
      await Promise.race([
        win.webContents.executeJavaScript('window.__sync ? window.__sync.flush() : null'),
        new Promise((r) => setTimeout(r, 6000)),
      ]);
      const raw = await win.webContents.executeJavaScript("localStorage.getItem('payroll.db')");
      if (raw) {
        const dir = path.join(app.getPath('documents'), 'PayrollBackups');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `payroll-${new Date().toISOString().slice(0, 10)}.json`), raw);
      }
    } catch { /* ignore */ }
    done = true;
    win.close();
  });
});

app.on('window-all-closed', () => app.quit());
