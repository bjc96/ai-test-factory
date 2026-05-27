const { shell, dialog } = global.electron
const { dbService } = require('../services/db')
const { claudeCliService } = require('../services/claude-cli')
const { existsSync } = require('fs')

function registerFileHandlers(ipcMain) {
  // Claude CLI 检测
  ipcMain.handle('check-claude', async () => {
    const available = await claudeCliService.isAvailable()
    const resolvedPath = claudeCliService.getResolvedPath()
    // 保存到 settings
    await dbService.init()
    dbService.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['claude_available', String(available)])
    dbService.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['claude_resolved_path', resolvedPath])
    return { available, resolvedPath }
  })

  ipcMain.handle('open-file', async (_event, path) => {
    if (!existsSync(path)) return { success: false, error: '文件不存在' }
    await shell.openPath(path)
    return { success: true }
  })

  ipcMain.handle('open-folder', async (_event, path) => {
    if (!existsSync(path)) return { success: false, error: '文件夹不存在' }
    await shell.openPath(path)
    return { success: true }
  })

  ipcMain.handle('select-file', async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      title: '选择文件',
      filters: filters || [{ name: '所有文件', extensions: ['*'] }],
      properties: ['openFile']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('get-settings', async () => {
    await dbService.init()
    const rows = dbService.queryAll('SELECT * FROM settings')
    const settings = {}
    for (const row of rows) settings[row.key] = row.value
    return settings
  })

  ipcMain.handle('save-settings', async (_event, settings) => {
    await dbService.init()
    dbService.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        dbService.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
      }
    })
    return { success: true }
  })
}

module.exports = { registerFileHandlers }
