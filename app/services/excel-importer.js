const ExcelJS = require('exceljs')

async function importTestCasesFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet(1)
  if (!sheet) {
    return { success: false, testCases: [], errors: ['无法读取 Excel 文件内容'] }
  }

  const errors = []
  const testCases = []

  // Detect title row
  let headerRowNum = 1
  const firstCellVal = sheet.getRow(1).getCell(1).value
  if (firstCellVal && typeof firstCellVal === 'string' && firstCellVal.includes('测试用例文档')) {
    headerRowNum = 2
  }

  // Build column map from header
  const headerRow = sheet.getRow(headerRowNum)
  const columnMap = {}

  const requiredHeaders = ['用例编号', '测试用例名称', '测试步骤', '预期结果']

  headerRow.eachCell((cell, colNum) => {
    const headerText = (cell.value || '').toString().trim()
    if (headerText) {
      columnMap[headerText] = colNum
    }
  })

  for (const h of requiredHeaders) {
    if (!(h in columnMap)) {
      errors.push(`缺少必须列: "${h}"`)
    }
  }

  if (errors.length > 0) {
    return { success: false, testCases: [], errors }
  }

  // Parse data rows
  sheet.eachRow((row, rowNum) => {
    if (rowNum <= headerRowNum) return

    const get = (header) => {
      const colNum = columnMap[header]
      if (!colNum) return ''
      const cell = row.getCell(colNum)
      return (cell.value || '').toString().trim()
    }

    const caseId = get('用例编号')
    if (!caseId) return

    const testCase = {
      case_id: caseId,
      module: get('所属模块'),
      sub_module: get('子模块') || null,
      case_name: get('测试用例名称'),
      test_level: get('测试级别') || null,
      test_type: get('测试类型') || null,
      test_stage: get('测试阶段') || null,
      preconditions: get('前置条件') || null,
      test_steps: get('测试步骤'),
      expected_result: get('预期结果'),
      actual_result: get('实际结果') || null,
      status: get('状态') || 'UNTESTED'
    }

    if (!testCase.case_name) {
      errors.push(`第 ${rowNum} 行: 测试用例名称为空`)
      return
    }
    if (!testCase.test_steps) {
      errors.push(`第 ${rowNum} 行: 测试步骤为空`)
      return
    }

    testCases.push(testCase)
  })

  let title
  if (headerRowNum === 2) {
    const titleCell = sheet.getRow(1).getCell(1).value
    title = (titleCell || '').toString().replace('测试用例文档 — ', '') || undefined
  }

  return {
    success: errors.length === 0,
    testCases,
    errors,
    title
  }
}

module.exports = { importTestCasesFromExcel }
