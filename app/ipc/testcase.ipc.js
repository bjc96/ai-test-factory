const { dialog, app } = global.electron
const { dbService } = require('../services/db')
const { generateTestCasesExcel } = require('../services/excel-generator')
const { importTestCasesFromExcel } = require('../services/excel-importer')
const { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } = require('fs')
const { join } = require('path')

function tclog(msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${msg}\n`
  try {
    const logDir = join(app.getPath('userData'), 'logs')
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
    appendFileSync(join(logDir, 'testcase.log'), line)
  } catch {}
  console.log(msg)
}
const { claudeCliService } = require('../services/claude-cli')
const { TEST_CASE_GENERATION_PROMPT } = require('../prompts')

function registerTestCaseHandlers(ipcMain) {
  ipcMain.handle('get-test-cases', async (_event, requirementId) => {
    await dbService.init()
    return dbService.queryAll(
      'SELECT * FROM test_case WHERE requirement_id = ? ORDER BY module, case_id',
      [requirementId]
    )
  })

  ipcMain.handle('update-test-case', async (_event, data) => {
    await dbService.init()
    const fields = ['case_id', 'module', 'sub_module', 'case_name', 'test_level',
      'test_type', 'test_stage', 'preconditions', 'test_steps', 'expected_result',
      'actual_result', 'status']
    const sets = fields.filter(f => data[f] !== undefined)
    const setClause = sets.map(f => `${f} = ?`).join(', ')
    const values = sets.map(f => data[f])
    values.push(data.id)

    if (sets.length > 0) {
      dbService.run(`UPDATE test_case SET ${setClause} WHERE id = ?`, values)
    }
    return { success: true }
  })

  ipcMain.handle('batch-update-test-cases', async (_event, cases) => {
    await dbService.init()
    dbService.transaction(() => {
      for (const tc of cases) {
        dbService.run(
          `UPDATE test_case SET case_id=?, module=?, sub_module=?, case_name=?,
           test_level=?, test_type=?, test_stage=?, preconditions=?,
           test_steps=?, expected_result=?, actual_result=?, status=?
           WHERE id=?`,
          [tc.case_id, tc.module, tc.sub_module, tc.case_name,
            tc.test_level, tc.test_type, tc.test_stage, tc.preconditions,
            tc.test_steps, tc.expected_result, tc.actual_result || null, tc.status || 'UNTESTED',
            tc.id]
        )
      }
    })
    return { success: true, updatedCount: cases.length }
  })

  ipcMain.handle('export-excel', async (_event, requirementId) => {
    await dbService.init()
    const req = dbService.getOne(
      'SELECT title, raw_text FROM requirement WHERE id = ?', [requirementId]
    )
    if (!req) return { success: false, error: '需求不存在' }

    const cases = dbService.queryAll(
      'SELECT * FROM test_case WHERE requirement_id = ? ORDER BY module, case_id',
      [requirementId]
    )

    if (cases.length === 0) {
      return { success: false, error: '暂无测试用例，请先生成测试用例' }
    }

    const buffer = await generateTestCasesExcel(cases, req.title || '未命名需求')

    const outputDir = join(app.getPath('documents'), 'AI-Test-Factory', 'test-cases')
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

    const fileName = `${req.title || 'test-cases'}_${Date.now()}.xlsx`
    const filePath = join(outputDir, fileName)
    writeFileSync(filePath, buffer)

    dbService.run(
      'INSERT INTO artifact (requirement_id, artifact_type, file_name, file_path) VALUES (?, ?, ?, ?)',
      [requirementId, 'EXCEL', fileName, filePath]
    )

    return { success: true, filePath, fileName }
  })

  ipcMain.handle('import-excel', async (_event) => {
    await dbService.init()
    const result = await dialog.showOpenDialog({
      title: '导入测试用例 Excel',
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '未选择文件' }
    }

    const filePath = result.filePaths[0]
    const buffer = readFileSync(filePath)
    const importResult = await importTestCasesFromExcel(buffer)

    if (!importResult.success) {
      return { success: false, errors: importResult.errors }
    }

    const title = importResult.title || `导入_${new Date().toLocaleDateString()}`
    const requirementId = dbService.runAndGetId(
      'INSERT INTO requirement (title, raw_text, status) VALUES (?, ?, ?)',
      [title, '从 Excel 导入', 'done']
    )

    dbService.transaction(() => {
      for (const tc of importResult.testCases) {
        dbService.run(
          `INSERT INTO test_case (requirement_id, case_id, module, sub_module, case_name,
           test_level, test_type, test_stage, preconditions, test_steps,
           expected_result, actual_result, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [requirementId, tc.case_id, tc.module, tc.sub_module,
            tc.case_name, tc.test_level, tc.test_type, tc.test_stage,
            tc.preconditions, tc.test_steps, tc.expected_result,
            tc.actual_result, tc.status || 'UNTESTED']
        )
      }
    })

    return { success: true, requirementId, importedCount: importResult.testCases.length }
  })

  ipcMain.handle('generate-test-cases', async (_event, requirementId) => {
    try {
      await dbService.init()
      const req = dbService.getOne('SELECT * FROM requirement WHERE id = ?', [requirementId])
      if (!req) return { success: false, error: '需求不存在' }

      const fps = dbService.queryAll(
        'SELECT * FROM function_point WHERE requirement_id = ? ORDER BY seq_no',
        [requirementId]
      )

      const tps = dbService.queryAll(
        `SELECT tp.*, fp.name as fp_name, fp.description as fp_desc
         FROM test_point tp
         JOIN function_point fp ON tp.function_point_id = fp.id
         WHERE fp.requirement_id = ?
         ORDER BY fp.seq_no, tp.seq_no`,
        [requirementId]
      )

      if (fps.length === 0) {
        return { success: false, error: '暂无功能点，请先分析需求' }
      }

      const analysisData = {
        title: req.title,
        functionPoints: fps.map(fp => ({
          seqNo: fp.seq_no,
          name: fp.name,
          description: fp.description,
          category: fp.category,
          riskLevel: fp.risk_level,
          testPoints: tps
            .filter(tp => tp.function_point_id === fp.id)
            .map(tp => ({
              seqNo: tp.seq_no,
              name: tp.name,
              testType: tp.test_type,
              preconditions: tp.preconditions
            }))
        }))
      }

      const analysisJson = JSON.stringify(analysisData, null, 2)
      tclog(`generate-test-cases reqId=${requirementId} fps=${analysisData.functionPoints.length} tps=${analysisData.functionPoints.reduce((s, fp) => s + fp.testPoints.length, 0)} analysisJson=${analysisJson.length}chars`)

      const rawResult = await claudeCliService.analyzeStructured(
        TEST_CASE_GENERATION_PROMPT,
        analysisJson
      )

      tclog(`rawResult type=${typeof rawResult} isArray=${Array.isArray(rawResult)} ${Array.isArray(rawResult) ? 'len=' + rawResult.length : 'keys=' + Object.keys(rawResult || {}).slice(0,10)}`)

      // 兼容多种返回格式
      let cases = []
      if (Array.isArray(rawResult)) {
        cases = rawResult
        tclog(`cases from array: ${cases.length}`)
      } else if (rawResult && typeof rawResult === 'object') {
        cases = rawResult.testCases || rawResult.cases || rawResult.data || rawResult.items || []
        tclog(`cases from object keys: ${cases.length}, searched testCases/cases/data/items, all keys=${Object.keys(rawResult).slice(0,20)}`)
        if (cases.length === 0 && (rawResult.caseId || rawResult.case_id)) {
          cases = [rawResult]
          tclog('cases from single object')
        }
      }

      if (cases.length === 0) {
        tclog(`FAILED: 0 cases, rawResult sample: ${JSON.stringify(rawResult).substring(0, 500)}`)
        return {
          success: false,
          error: 'AI 未生成任何测试用例',
          diag: {
            fpsCount: analysisData.functionPoints.length,
            tpsCount: analysisData.functionPoints.reduce((s, fp) => s + fp.testPoints.length, 0),
            resultType: typeof rawResult,
            resultKeys: Object.keys(rawResult || {}).slice(0, 10)
          }
        }
      }

      tclog(`inserting ${cases.length} cases, first caseId=${cases[0].caseId || cases[0].case_id || 'N/A'}`)

      dbService.run('DELETE FROM test_case WHERE requirement_id = ?', [requirementId])

      dbService.transaction(() => {
        for (const tc of cases) {
          dbService.run(
            `INSERT INTO test_case (requirement_id, case_id, module, case_name,
             test_level, test_type, test_stage, preconditions, test_steps, expected_result)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [requirementId,
              tc.caseId || tc.case_id || '',
              tc.module || '',
              tc.caseName || tc.case_name || tc.name || '',
              tc.testLevel || tc.test_level || 'P2',
              tc.testType || tc.test_type || '功能测试',
              tc.testStage || tc.test_stage || '系统测试',
              tc.preconditions || '',
              tc.testSteps || tc.test_steps || '',
              tc.expectedResult || tc.expected_result || '']
          )
        }
      })

      const savedCases = dbService.queryAll(
        'SELECT * FROM test_case WHERE requirement_id = ? ORDER BY module, case_id',
        [requirementId]
      )

      return { success: true, testCases: savedCases }
    } catch (error) {
      return { success: false, error: error.message || '生成测试用例失败' }
    }
  })
}

module.exports = { registerTestCaseHandlers }
