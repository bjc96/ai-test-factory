const ExcelJS = require('exceljs')

const STYLE = {
  headerBg: 'FFD9E1F2',
  borderStyle: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  headerAlignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  dataAlignment: { vertical: 'top', horizontal: 'left', wrapText: true }
}

const COLUMNS = [
  { header: '用例编号', key: 'case_id', width: 18 },
  { header: '所属模块', key: 'module', width: 16 },
  { header: '子模块', key: 'sub_module', width: 14 },
  { header: '测试用例名称', key: 'case_name', width: 35 },
  { header: '测试级别', key: 'test_level', width: 10 },
  { header: '测试类型', key: 'test_type', width: 14 },
  { header: '测试阶段', key: 'test_stage', width: 14 },
  { header: '前置条件', key: 'preconditions', width: 30 },
  { header: '测试步骤', key: 'test_steps', width: 50 },
  { header: '预期结果', key: 'expected_result', width: 50 },
  { header: '实际结果', key: 'actual_result', width: 30 },
  { header: '状态', key: 'status', width: 12 },
  { header: '备注', key: 'remark', width: 20 }
]

async function generateTestCasesExcel(testCases, title) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('测试用例')

  sheet.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width
  }))

  // Header style
  const headerRow = sheet.getRow(1)
  headerRow.height = 24
  for (let i = 1; i <= COLUMNS.length; i++) {
    const cell = headerRow.getCell(i)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STYLE.headerBg } }
    cell.font = { bold: true, size: 11, name: '微软雅黑' }
    cell.alignment = STYLE.headerAlignment
    cell.border = {
      top: STYLE.borderStyle,
      bottom: STYLE.borderStyle,
      left: STYLE.borderStyle,
      right: STYLE.borderStyle
    }
  }

  // Data rows
  for (let ri = 0; ri < testCases.length; ri++) {
    const tc = testCases[ri]
    const row = sheet.addRow({
      case_id: tc.case_id,
      module: tc.module,
      sub_module: tc.sub_module || '',
      case_name: tc.case_name,
      test_level: tc.test_level || '',
      test_type: tc.test_type || '功能测试',
      test_stage: tc.test_stage || '系统测试',
      preconditions: tc.preconditions || '',
      test_steps: tc.test_steps,
      expected_result: tc.expected_result,
      actual_result: tc.actual_result || '',
      status: tc.status || 'UNTESTED',
      remark: tc.remark || ''
    })

    const lineCount = tc.test_steps ? tc.test_steps.split('\n').length : 1
    row.height = Math.max(20, 15 * lineCount)

    for (let ci = 1; ci <= COLUMNS.length; ci++) {
      const cell = row.getCell(ci)
      cell.font = { size: 10, name: '微软雅黑' }
      cell.alignment = STYLE.dataAlignment
      cell.border = {
        top: STYLE.borderStyle,
        bottom: STYLE.borderStyle,
        left: STYLE.borderStyle,
        right: STYLE.borderStyle
      }

      if (ci === 12) {
        const statusStr = (cell.value || '').toString().toUpperCase()
        if (statusStr === 'PASS') {
          cell.font = { size: 10, name: '微软雅黑', color: { argb: 'FF388E3C' } }
        } else if (statusStr === 'FAIL') {
          cell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFD32F2F' } }
        }
      }
    }
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: testCases.length + 1, column: COLUMNS.length }
  }

  // Title row
  sheet.insertRow(1, [`测试用例文档 — ${title}`], 'i')
  const titleRow = sheet.getRow(1)
  titleRow.height = 32
  titleRow.getCell(1).font = { bold: true, size: 14, name: '微软雅黑' }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.mergeCells(1, 1, 1, COLUMNS.length)
  sheet.views = [{ state: 'frozen', ySplit: 2 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function generateBlankTemplate() {
  return generateTestCasesExcel([], '空白模板')
}

module.exports = { generateTestCasesExcel, generateBlankTemplate, COLUMNS }
