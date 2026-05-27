import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Requirement {
  id: number
  title: string | null
  raw_text: string
  ai_result: string | null
  status: string
  created_at: string
}

export interface FunctionPoint {
  id?: number
  requirement_id?: number
  seqNo: number
  name: string
  description: string
  category: string
  riskLevel: string
  testPoints: TestPoint[]
}

export interface TestPoint {
  id?: number
  function_point_id?: number
  seqNo: number
  name: string
  testType: string
  preconditions: string
}

export interface TestCase {
  id?: number
  requirement_id?: number
  case_id: string
  module: string
  sub_module: string | null
  case_name: string
  test_level: string
  test_type: string
  test_stage: string
  preconditions: string
  test_steps: string
  expected_result: string
  actual_result: string | null
  status: string
}

export const useRequirementStore = defineStore('requirement', () => {
  const currentRequirement = ref<Requirement | null>(null)
  const functionPoints = ref<FunctionPoint[]>([])
  const testCases = ref<TestCase[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function analyzeRequirement(text: string) {
    loading.value = true
    error.value = null
    try {
      const result = await (window as any).electronAPI.analyzeRequirement(text)
      if (result.success) {
        functionPoints.value = result.functionPoints
        currentRequirement.value = {
          id: result.requirementId,
          title: result.title,
          raw_text: text,
          ai_result: null,
          status: 'done',
          created_at: new Date().toISOString()
        }
        return result
      } else {
        error.value = result.error
        return result
      }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  async function loadRequirement(id: number) {
    const result = await (window as any).electronAPI.getRequirement(id)
    if (result) {
      currentRequirement.value = {
        id: result.id,
        title: result.title,
        raw_text: result.raw_text,
        ai_result: result.ai_result,
        status: result.status,
        created_at: result.created_at
      }
      if (result.ai_result) {
        try {
          const aiData = JSON.parse(result.ai_result)
          functionPoints.value = aiData.functionPoints || []
        } catch {
          functionPoints.value = []
        }
      }
    }
  }

  async function generateTestCases(requirementId: number) {
    loading.value = true
    try {
      const result = await (window as any).electronAPI.generateTestCases(requirementId)
      if (result.success) {
        testCases.value = result.testCases
      }
      return result
    } finally {
      loading.value = false
    }
  }

  async function loadTestCases(requirementId: number) {
    const result = await (window as any).electronAPI.getTestCases(requirementId)
    testCases.value = result || []
  }

  async function updateTestCase(data: Partial<TestCase> & { id: number }) {
    await (window as any).electronAPI.updateTestCase(data)
  }

  async function exportExcel(requirementId: number) {
    return await (window as any).electronAPI.exportExcel(requirementId)
  }

  async function importExcel() {
    return await (window as any).electronAPI.importExcel()
  }

  return {
    currentRequirement, functionPoints, testCases, loading, error,
    analyzeRequirement, loadRequirement, loadTestCases,
    generateTestCases, updateTestCase, exportExcel, importExcel
  }
})
