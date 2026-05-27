const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  analyzeRequirement: (text) => ipcRenderer.invoke('analyze-requirement', text),
  getTestCases: (requirementId) => ipcRenderer.invoke('get-test-cases', requirementId),
  updateTestCase: (data) => ipcRenderer.invoke('update-test-case', data),
  batchUpdateTestCases: (cases) => ipcRenderer.invoke('batch-update-test-cases', cases),
  exportExcel: (requirementId) => ipcRenderer.invoke('export-excel', requirementId),
  importExcel: () => ipcRenderer.invoke('import-excel'),
  generateTestCases: (requirementId) => ipcRenderer.invoke('generate-test-cases', requirementId),
  generateScripts: (requirementId) => ipcRenderer.invoke('generate-scripts', requirementId),
  generateSingleScript: (testCase) => ipcRenderer.invoke('generate-single-script', testCase),
  getScripts: (requirementId) => ipcRenderer.invoke('get-scripts', requirementId),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  getRequirements: () => ipcRenderer.invoke('get-requirements'),
  getRequirement: (id) => ipcRenderer.invoke('get-requirement', id),
  deleteRequirement: (id) => ipcRenderer.invoke('delete-requirement', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  checkClaude: () => ipcRenderer.invoke('check-claude'),
  runScript: (path) => ipcRenderer.invoke('run-script', path)
})
