/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  analyzeRequirement(text: string): Promise<any>
  getTestCases(requirementId: number): Promise<any[]>
  updateTestCase(data: any): Promise<any>
  batchUpdateTestCases(cases: any[]): Promise<any>
  exportExcel(requirementId: number): Promise<any>
  importExcel(): Promise<any>
  generateTestCases(requirementId: number): Promise<any>
  generateScripts(requirementId: number): Promise<any>
  generateSingleScript(testCase: any): Promise<any>
  getScripts(requirementId: number): Promise<any[]>
  openFile(path: string): Promise<any>
  openFolder(path: string): Promise<any>
  selectFile(filters?: any[]): Promise<string | null>
  getRequirements(): Promise<any[]>
  getRequirement(id: number): Promise<any>
  deleteRequirement(id: number): Promise<any>
  getSettings(): Promise<Record<string, string>>
  saveSettings(settings: Record<string, string>): Promise<any>
  checkClaude(): Promise<{available: boolean; resolvedPath: string}>
  runScript(path: string): Promise<any>
}

interface Window {
  electronAPI: ElectronAPI
}
