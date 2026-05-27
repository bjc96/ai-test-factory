<template>
  <div class="testcase-view">
    <el-page-header @back="$router.push(`/requirements/${requirementId}`)" content="测试用例管理" />

    <!-- 工具栏 -->
    <el-card class="toolbar-card">
      <el-space>
        <el-button type="primary" @click="exportExcel" :loading="exporting">
           导出 Excel
        </el-button>
        <el-button type="success" @click="generateScripts" :loading="generating">
           生成自动化脚本
        </el-button>
        <el-button @click="$router.push(`/scripts/${requirementId}`)">
           查看脚本
        </el-button>
        <el-input v-model="searchText" placeholder="搜索用例..." clearable style="width:220px" />
        <el-select v-model="levelFilter" placeholder="优先级" clearable style="width:100px">
          <el-option label="P0" value="P0" />
          <el-option label="P1" value="P1" />
          <el-option label="P2" value="P2" />
          <el-option label="P3" value="P3" />
        </el-select>
      </el-space>
    </el-card>

    <!-- 测试用例表格 -->
    <el-card v-if="filteredCases.length > 0">
      <el-table :data="filteredCases" style="width:100%" border stripe :max-height="500">
        <el-table-column prop="case_id" label="编号" width="140" />
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="case_name" label="用例名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="test_level" label="级别" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.test_level === 'P0' ? 'danger' : row.test_level === 'P1' ? 'warning' : 'info'" size="small">
              {{ row.test_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="test_type" label="类型" width="90" />
        <el-table-column prop="test_steps" label="测试步骤" min-width="200" show-overflow-tooltip />
        <el-table-column prop="expected_result" label="预期结果" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'PASS' ? 'success' : row.status === 'FAIL' ? 'danger' : ''"
              size="small"
            >
              {{ row.status || 'UNTESTED' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editCase(row)">编辑</el-button>
            <el-button size="small" type="success" :loading="generatingIds.includes(row.id)" @click="generateSingle(row)">生成</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 8px; color: #909399; font-size: 13px;">
        共 {{ filteredCases.length }} 条用例
      </div>
    </el-card>

    <el-empty v-else-if="testCases.length === 0" description="暂无测试用例">
      <el-button type="primary" @click="generateCasesFromFP">从功能点生成测试用例</el-button>
    </el-empty>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑测试用例" width="700px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="90px" size="small">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用例编号"><el-input v-model="editForm.case_id" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属模块"><el-input v-model="editForm.module" /></el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="用例名称"><el-input v-model="editForm.case_name" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="测试级别">
              <el-select v-model="editForm.test_level">
                <el-option label="P0" value="P0" /><el-option label="P1" value="P1" />
                <el-option label="P2" value="P2" /><el-option label="P3" value="P3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="测试类型"><el-input v-model="editForm.test_type" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="editForm.status">
                <el-option label="未测试" value="UNTESTED" />
                <el-option label="通过" value="PASS" />
                <el-option label="失败" value="FAIL" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="前置条件"><el-input v-model="editForm.preconditions" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="测试步骤"><el-input v-model="editForm.test_steps" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="预期结果"><el-input v-model="editForm.expected_result" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="实际结果"><el-input v-model="editForm.actual_result" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRequirementStore, TestCase } from '../stores/requirement'

const route = useRoute()
const router = useRouter()
const store = useRequirementStore()

const requirementId = computed(() => Number(route.params.requirementId))
const testCases = computed(() => store.testCases)
const loading = computed(() => store.loading)

const searchText = ref('')
const levelFilter = ref('')
const exporting = ref(false)
const generating = ref(false)

const filteredCases = computed(() => {
  let list = testCases.value
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter((tc: TestCase) =>
      tc.case_name.toLowerCase().includes(kw) ||
      tc.case_id.toLowerCase().includes(kw) ||
      (tc.test_steps || '').toLowerCase().includes(kw)
    )
  }
  if (levelFilter.value) {
    list = list.filter((tc: TestCase) => tc.test_level === levelFilter.value)
  }
  return list
})

// 单脚本生成跟踪
const generatingIds = ref<number[]>([])

// 编辑
const editDialogVisible = ref(false)
const editForm = ref<Partial<TestCase> & { id: number }>({
  id: 0, case_id: '', module: '', case_name: '', test_level: 'P2',
  test_type: '功能测试', test_stage: '系统测试', preconditions: '',
  test_steps: '', expected_result: '', actual_result: '', status: 'UNTESTED'
})

function editCase(row: TestCase & { id: number }) {
  editForm.value = { ...row }
  editDialogVisible.value = true
}

async function saveEdit() {
  await store.updateTestCase(editForm.value)
  // 更新本地数据
  const idx = testCases.value.findIndex((tc: any) => tc.id === editForm.value.id)
  if (idx >= 0) {
    testCases.value[idx] = { ...testCases.value[idx], ...editForm.value }
  }
  editDialogVisible.value = false
  ElMessage.success('保存成功')
}

onMounted(async () => {
  await store.loadRequirement(requirementId.value)
  await store.loadTestCases(requirementId.value)
})

async function generateCasesFromFP() {
  const result = await store.generateTestCases(requirementId.value)
  if (result.success) {
    ElMessage.success(`生成了 ${result.testCases.length} 条测试用例`)
  } else {
    ElMessage.error(result.error || '生成失败')
  }
}

async function exportExcel() {
  exporting.value = true
  try {
    const result = await store.exportExcel(requirementId.value)
    if (result.success) {
      ElMessage.success(`Excel 已导出: ${result.fileName}`)
      await window.electronAPI.openFile(result.filePath)
    } else {
      ElMessage.error(result.error || '导出失败')
    }
  } finally {
    exporting.value = false
  }
}

async function generateScripts() {
  generating.value = true
  try {
    const result = await window.electronAPI.generateScripts(requirementId.value)
    if (result.success) {
      ElMessage.success(`脚本已生成，共 ${result.fileCount} 个文件`)
      router.push(`/scripts/${requirementId.value}`)
    } else {
      ElMessage.error(result.error || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

async function generateSingle(row: any) {
  if (!row.id) { ElMessage.error('用例数据异常：缺少ID'); return }
  if (!window.electronAPI.generateSingleScript) { ElMessage.error('generateSingleScript 未加载，请完全重启应用（非热重载）'); return }
  ElMessage.info(`正在为 ${row.case_id} 生成脚本...`)
  generatingIds.value = [...generatingIds.value, row.id]
  try {
    // 只传纯数据，避免 Vue 响应式代理导致 IPC 序列化失败
    const plain = {
      case_id: row.case_id,
      module: row.module,
      case_name: row.case_name,
      test_level: row.test_level,
      test_steps: row.test_steps,
      expected_result: row.expected_result
    }
    const result = await window.electronAPI.generateSingleScript(plain)
    if (result.success) {
      ElMessage.success(`${row.case_id} 脚本已生成，共 ${result.fileCount} 个文件`)
      await window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error || '生成失败')
    }
  } catch (e: any) {
    ElMessage.error('生成异常: ' + (e.message || String(e)))
  } finally {
    generatingIds.value = generatingIds.value.filter(id => id !== row.id)
  }
}
</script>

<style scoped>
.testcase-view { max-width: 1300px; margin: 0 auto; }
.toolbar-card { margin-top: 16px; margin-bottom: 12px; }
</style>
