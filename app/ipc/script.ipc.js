const { app, shell } = global.electron
const { dbService } = require('../services/db')
const { claudeCliService } = require('../services/claude-cli')
const { writeFileSync, mkdirSync, existsSync, appendFileSync } = require('fs')
const { join } = require('path')
const { PLAYWRIGHT_GENERATION_PROMPT } = require('../prompts')

function slog(msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${msg}\n`
  try {
    const logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
    appendFileSync(join(logDir, 'script.log'), line)
  } catch {}
  console.log(msg)
}

function getSafeDirName(title) {
  return title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50)
}

function generateDefaultPlaywrightConfig() {
  return `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
`
}

function generateDefaultPackageJson() {
  return JSON.stringify({
    name: 'ai-test-scripts',
    version: '1.0.0',
    scripts: {
      test: 'npx playwright test',
      'test:headed': 'npx playwright test --headed'
    },
    devDependencies: { '@playwright/test': '^1.45.0' }
  }, null, 2)
}

function registerScriptHandlers(ipcMain) {
  ipcMain.handle('generate-scripts', async (_event, requirementId) => {
    try {
      await dbService.init()
      const req = dbService.getOne('SELECT * FROM requirement WHERE id = ?', [requirementId])
      if (!req) return { success: false, error: '需求不存在' }

      const cases = dbService.queryAll(
        'SELECT * FROM test_case WHERE requirement_id = ? ORDER BY module, case_id',
        [requirementId]
      )

      if (cases.length === 0) {
        return { success: false, error: '暂无测试用例' }
      }

      // 构建用例摘要
      const casesSummary = cases.map(tc => ({
        caseId: tc.case_id,
        module: tc.module,
        caseName: tc.case_name,
        testLevel: tc.test_level,
        testSteps: tc.test_steps,
        expectedResult: tc.expected_result
      }))

      // 按每组最多 15 个用例分批
      const BATCH_SIZE = 15
      const batches = []
      for (let i = 0; i < casesSummary.length; i += BATCH_SIZE) {
        batches.push(casesSummary.slice(i, i + BATCH_SIZE))
      }

      slog(`generate-scripts reqId=${requirementId} totalCases=${casesSummary.length} batches=${batches.length}`)

      const allFiles = []
      for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi]
        const batchJson = JSON.stringify(batch, null, 2)
        slog(`  batch ${bi + 1}/${batches.length}: ${batch.length} cases, ${batchJson.length} chars`)

        const result = await claudeCliService.analyzeStructured(
          PLAYWRIGHT_GENERATION_PROMPT,
          batchJson
        )

        let batchFiles = []
        if (result.files && Array.isArray(result.files)) {
          batchFiles = result.files
        } else if (Array.isArray(result)) {
          batchFiles = result
        } else if (result && typeof result === 'object') {
          batchFiles = result.data || result.scripts || result.items || []
        }

        slog(`  batch ${bi + 1} result: ${batchFiles.length} files`)
        allFiles.push(...batchFiles)
      }

      slog(`total files from all batches: ${allFiles.length}`)

      const safeName = getSafeDirName(req.title || 'unnamed')
      const outputDir = join(app.getPath('documents'), 'AI-Test-Factory', 'scripts', `${safeName}_${requirementId}`)
      if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

      const generatedFiles = []

      if (allFiles.length > 0) {
        for (const file of allFiles) {
          if (!file.path || !file.content) { slog(`skip file missing path/content`); continue }
          const parts = file.path.split('/')
          const filePath = join(outputDir, ...parts)
          const fileDir = join(outputDir, ...parts.slice(0, -1))
          if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true })
          writeFileSync(filePath, file.content, 'utf-8')
          generatedFiles.push(filePath)
          slog(`wrote ${filePath}`)
        }
      }

      // 写入 playwright.config.ts 和 package.json
      const configPath = join(outputDir, 'playwright.config.ts')
      writeFileSync(configPath, result.playwrightConfig || generateDefaultPlaywrightConfig(), 'utf-8')
      generatedFiles.push(configPath)

      const pkgPath = join(outputDir, 'package.json')
      writeFileSync(pkgPath, result.packageJson || generateDefaultPackageJson(), 'utf-8')
      generatedFiles.push(pkgPath)

      dbService.run(
        'INSERT INTO artifact (requirement_id, artifact_type, file_name, file_path) VALUES (?, ?, ?, ?)',
        [requirementId, 'PLAYWRIGHT_SCRIPT', `scripts_${requirementId}`, outputDir]
      )

      slog(`DONE: ${generatedFiles.length} files in ${outputDir}`)
      return { success: true, outputDir, fileCount: generatedFiles.length, files: generatedFiles }
    } catch (error) {
      slog(`ERROR: ${error.message}`)
      return { success: false, error: error.message || '生成脚本失败' }
    }
  })

  // 单个用例生成脚本
  ipcMain.handle('generate-single-script', async (_event, testCase) => {
    try {
      slog(`generate-single-script: ${testCase.case_id} "${testCase.case_name}"`)
      const singleCase = [{
        caseId: testCase.case_id,
        module: testCase.module,
        caseName: testCase.case_name,
        testLevel: testCase.test_level,
        testSteps: testCase.test_steps,
        expectedResult: testCase.expected_result
      }]

      const result = await claudeCliService.analyzeStructured(
        PLAYWRIGHT_GENERATION_PROMPT,
        JSON.stringify(singleCase, null, 2)
      )

      let files = []
      if (result.files && Array.isArray(result.files)) files = result.files
      else if (Array.isArray(result)) files = result

      const fileName = testCase.case_id.replace(/[\\/:*?"<>|]/g, '_')
      const outputDir = join(app.getPath('documents'), 'AI-Test-Factory', 'scripts', `single_${fileName}`)
      if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

      const generatedFiles = []
      for (const file of files) {
        if (!file.path || !file.content) continue
        const parts = file.path.split('/')
        const filePath = join(outputDir, ...parts)
        const fileDir = join(outputDir, ...parts.slice(0, -1))
        if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true })
        writeFileSync(filePath, file.content, 'utf-8')
        generatedFiles.push(filePath)
      }

      slog(`generate-single-script DONE: ${generatedFiles.length} files`)
      return { success: true, outputDir, fileCount: generatedFiles.length, files: generatedFiles }
    } catch (error) {
      slog(`generate-single-script ERROR: ${error.message}`)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-scripts', async (_event, requirementId) => {
    await dbService.init()
    return dbService.queryAll(
      'SELECT * FROM artifact WHERE requirement_id = ? AND artifact_type = ? ORDER BY created_at DESC',
      [requirementId, 'PLAYWRIGHT_SCRIPT']
    )
  })

  ipcMain.handle('run-script', async (_event, scriptDir) => {
    try {
      const cmd = `cd "${scriptDir}" && npx playwright test`
      shell.openPath(`cmd.exe /c start cmd.exe /k "${cmd}"`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerScriptHandlers }
