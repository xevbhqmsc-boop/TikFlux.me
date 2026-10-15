const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow, dialog } = require('electron');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Update server URL - set via environment variable or default
const UPDATE_SERVER = process.env.TIKLINUX_UPDATE_URL || 'https://github.com/tiklinux/desktop-releases';

autoUpdater.setFeedURL({
  provider: 'generic',
  url: UPDATE_SERVER,
  channel: 'latest',
});

// Check for updates
function checkForUpdates(mainWindow) {
  if (!mainWindow) return;

  autoUpdater.checkForUpdates().catch(err => {
    console.log('[Updater] Check failed:', err.message);
  });

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'تحديث متاح',
      message: `تحديث جديد متاح: v${info.version}`,
      buttons: ['تحديث الآن', 'لاحقاً'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const msg = `جاري التحميل: ${Math.round(progress.percent)}%`;
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.webContents.send('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.setProgressBar(-1);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'تحديث جاهز',
      message: 'تم تحميل التحديث. يُعاد تشغيل التطبيق الآن.',
      buttons: ['إعادة التشغيل', 'لاحقاً'],
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.log('[Updater] Error:', err.message);
  });
}

module.exports = { checkForUpdates };
