const { app, BrowserWindow } = require('electron')
const { join } = require('path')

console.log('Electron starting...')
console.log('app:', typeof app)
console.log('BrowserWindow:', typeof BrowserWindow)

let mainWindow = null

app.whenReady().then(() => {
  console.log('app ready, creating window...')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: '智能测试工场',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 开发模式加载 Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
