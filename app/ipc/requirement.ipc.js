const { dbService } = require('../services/db')
const { claudeCliService } = require('../services/claude-cli')
const { REQUIREMENT_ANALYSIS_PROMPT } = require('../prompts')

function registerRequirementHandlers(ipcMain) {
  ipcMain.handle('analyze-requirement', async (_event, text) => {
    try {
      await dbService.init()

      const requirementId = dbService.runAndGetId(
        'INSERT INTO requirement (raw_text, status) VALUES (?, ?)',
        [text, 'analyzing']
      )

      const result = await claudeCliService.analyzeStructured(REQUIREMENT_ANALYSIS_PROMPT, text)

      const aiResultJson = JSON.stringify(result)
      dbService.run(
        'UPDATE requirement SET title = ?, ai_result = ?, status = ? WHERE id = ?',
        [result.title || '未命名需求', aiResultJson, 'done', requirementId]
      )

      for (const fp of result.functionPoints) {
        const fpId = dbService.runAndGetId(
          'INSERT INTO function_point (requirement_id, seq_no, name, description, category, risk_level) VALUES (?, ?, ?, ?, ?, ?)',
          [requirementId, fp.seqNo, fp.name, fp.description || '', fp.category || '功能类', fp.riskLevel || 'MEDIUM']
        )

        for (const tp of fp.testPoints) {
          dbService.run(
            'INSERT INTO test_point (function_point_id, seq_no, name, test_type, preconditions) VALUES (?, ?, ?, ?, ?)',
            [fpId, tp.seqNo, tp.name, tp.testType || 'positive', tp.preconditions || '']
          )
        }
      }

      return {
        success: true,
        requirementId,
        title: result.title,
        functionPoints: result.functionPoints
      }
    } catch (error) {
      return { success: false, error: error.message || '分析失败' }
    }
  })

  ipcMain.handle('get-requirements', async () => {
    await dbService.init()
    return dbService.queryAll('SELECT * FROM requirement ORDER BY created_at DESC')
  })

  ipcMain.handle('get-requirement', async (_event, id) => {
    await dbService.init()
    const req = dbService.getOne('SELECT * FROM requirement WHERE id = ?', [id])
    if (!req) return null

    const fps = dbService.queryAll(
      'SELECT * FROM function_point WHERE requirement_id = ? ORDER BY seq_no', [id]
    )
    const tps = dbService.queryAll(
      `SELECT tp.* FROM test_point tp
       JOIN function_point fp ON tp.function_point_id = fp.id
       WHERE fp.requirement_id = ?
       ORDER BY fp.seq_no, tp.seq_no`, [id]
    )

    return { ...req, functionPoints: fps, testPoints: tps }
  })

  ipcMain.handle('delete-requirement', async (_event, id) => {
    await dbService.init()
    dbService.run('DELETE FROM requirement WHERE id = ?', [id])
    return { success: true }
  })
}

module.exports = { registerRequirementHandlers }
