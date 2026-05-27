const electron = require('electron')
const { app, BrowserWindow, ipcMain } = electron
const { join } = require('path')

global.electron = electron

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: '智能测试工场',
    webPreferences: {
      preload: join(__dirname, 'app', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'))
  }
}

const { registerRequirementHandlers } = require('./app/ipc/requirement.ipc')
const { registerTestCaseHandlers } = require('./app/ipc/testcase.ipc')
const { registerScriptHandlers } = require('./app/ipc/script.ipc')
const { registerFileHandlers } = require('./app/ipc/file.ipc')

registerRequirementHandlers(ipcMain)
registerTestCaseHandlers(ipcMain)
registerScriptHandlers(ipcMain)
registerFileHandlers(ipcMain)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
