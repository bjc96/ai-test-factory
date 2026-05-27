<template>
  <div class="tc-list">
    <div class="page-header">
      <h1 class="page-title">测试用例</h1>
      <el-button type="primary" @click="handleImport">
        <el-icon><Upload /></el-icon> 导入 Excel
      </el-button>
    </div>

    <el-card v-if="requirements.length > 0">
      <el-table :data="requirements" style="width:100%">
        <el-table-column prop="title" label="需求名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/test-cases/${row.id}`)">
              {{ row.title || '未命名需求' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="用例数" width="100">
          <template #default="{ row }">{{ row.caseCount || 0 }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="$router.push(`/test-cases/${row.id}`)">查看用例</el-button>
            <el-button size="small" @click="exportExcel(row.id)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else description="暂无测试用例">
      <el-button type="primary" @click="$router.push('/requirements/new')">创建需求</el-button>
      <el-button @click="handleImport">导入 Excel</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRequirementStore } from '../stores/requirement'

const store = useRequirementStore()
const requirements = ref<any[]>([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  const reqs = await window.electronAPI.getRequirements()
  for (const req of reqs) {
    const cases = await window.electronAPI.getTestCases(req.id)
    req.caseCount = cases.length
  }
  requirements.value = reqs.filter((r: any) => r.status === 'done')
}

async function handleImport() {
  const result = await store.importExcel()
  if (result.success) {
    ElMessage.success(`成功导入 ${result.importedCount} 条测试用例`)
    await loadData()
  } else {
    ElMessage.error(result.error || '导入失败')
  }
}

async function exportExcel(id: number) {
  const result = await store.exportExcel(id)
  if (result.success) {
    ElMessage.success('导出成功')
    await window.electronAPI.openFile(result.filePath)
  } else {
    ElMessage.error(result.error || '导出失败')
  }
}
</script>

<style scoped>
.tc-list { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; color: #303133; }
</style>
