<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalRequirements }}</div>
          <div class="stat-label">需求总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalTestCases }}</div>
          <div class="stat-label">测试用例总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalScripts }}</div>
          <div class="stat-label">生成脚本数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :class="{ connected: claudeAvailable }">
            {{ claudeAvailable ? '已连接' : '未连接' }}
          </div>
          <div class="stat-label">Claude CLI 状态</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="action-card">
      <template #header>
        <span>快捷操作</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-button type="primary" size="large" @click="$router.push('/requirements/new')" style="width:100%">
             新建需求分析
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button type="success" size="large" @click="handleImportExcel" style="width:100%">
             导入测试用例 Excel
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button type="warning" size="large" @click="$router.push('/requirements')" style="width:100%">
             查看需求历史
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="recent-card" v-if="recentRequirements.length > 0">
      <template #header>
        <span>最近需求</span>
      </template>
      <el-table :data="recentRequirements" style="width:100%">
        <el-table-column prop="title" label="需求名称" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'done' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">
              {{ row.status === 'done' ? '已完成' : row.status === 'failed' ? '失败' : '分析中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/requirements/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const stats = ref({ totalRequirements: 0, totalTestCases: 0, totalScripts: 0 })
const claudeAvailable = ref(false)
const claudePath = ref('')
const recentRequirements = ref<any[]>([])

onMounted(async () => {
  const reqs = await window.electronAPI.getRequirements()
  stats.value.totalRequirements = reqs.length
  recentRequirements.value = reqs.slice(0, 5)

  // 主动检测 Claude CLI
  try {
    const result = await window.electronAPI.checkClaude()
    claudeAvailable.value = result.available
    claudePath.value = result.resolvedPath
  } catch {
    // fallback to settings
    try {
      const settings = await window.electronAPI.getSettings()
      claudeAvailable.value = settings.claude_available === 'true'
    } catch {}
  }
})

async function handleImportExcel() {
  const result = await window.electronAPI.importExcel()
  if (result.success) {
    ElMessage.success(`成功导入 ${result.importedCount} 条测试用例`)
    stats.value.totalRequirements++
    stats.value.totalTestCases += result.importedCount
  } else {
    ElMessage.error(result.error || result.errors?.join('; ') || '导入失败')
  }
}
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; }
.page-title { font-size: 24px; margin-bottom: 24px; color: #303133; }
.stats-row { margin-bottom: 20px; }
.stat-card { text-align: center; cursor: default; }
.stat-value { font-size: 28px; font-weight: bold; color: #409EFF; }
.stat-value.connected { color: #67C23A; }
.stat-label { font-size: 14px; color: #909399; margin-top: 8px; }
.action-card { margin-bottom: 20px; }
.recent-card { margin-top: 20px; }
</style>
