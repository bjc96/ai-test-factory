<template>
  <div class="requirement-detail">
    <el-page-header @back="$router.push('/requirements')" :content="title || '需求详情'" />

    <el-card class="detail-card" v-if="req">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="需求标题">{{ req.title || '未命名' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag">{{ statusLabel }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ req.created_at }}</el-descriptions-item>
        <el-descriptions-item label="功能点数">{{ fps.length }}</el-descriptions-item>
        <el-descriptions-item label="原始需求" :span="2">
          <pre class="raw-text">{{ req.raw_text }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 功能点与测试点 -->
    <el-card v-if="fps.length > 0" class="fp-section">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>功能点 & 测试点</span>
          <div>
            <el-button type="primary" size="small" @click="generateCases" :loading="loading">生成测试用例</el-button>
            <el-button size="small" @click="viewTestCases">查看测试用例 ({{ caseCount }})</el-button>
          </div>
        </div>
      </template>
      <div v-for="fp in fps" :key="fp.seqNo" class="fp-block">
        <div class="fp-title">
          <strong>{{ fp.seqNo }}. {{ fp.name }}</strong>
          <el-tag size="small">{{ fp.category }}</el-tag>
          <el-tag size="small" :type="fp.riskLevel === 'HIGH' ? 'danger' : fp.riskLevel === 'MEDIUM' ? 'warning' : 'info'">{{ fp.riskLevel }}</el-tag>
        </div>
        <p class="fp-desc">{{ fp.description }}</p>
        <el-table :data="fp.testPoints" size="small">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="测试点" />
          <el-table-column prop="testType" label="类型" width="100" />
          <el-table-column prop="preconditions" label="前置条件" width="250" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRequirementStore } from '../stores/requirement'

const route = useRoute()
const router = useRouter()
const store = useRequirementStore()

const req = computed(() => store.currentRequirement)
const title = computed(() => req.value?.title || '加载中...')
const fps = computed(() => store.functionPoints)
const loading = computed(() => store.loading)
const caseCount = ref(0)

const statusLabel = computed(() => {
  const s = req.value?.status
  const map: Record<string, string> = { pending: '待分析', analyzing: '分析中', done: '已完成', failed: '失败' }
  return map[s || ''] || s || ''
})
const statusTag = computed(() => {
  const s = req.value?.status
  const map: Record<string, string> = { pending: 'warning', analyzing: '', done: 'success', failed: 'danger' }
  return map[s || ''] || ''
})

onMounted(async () => {
  const id = Number(route.params.id)
  await store.loadRequirement(id)
  const cases = await window.electronAPI.getTestCases(id)
  caseCount.value = cases.length
})

async function generateCases() {
  const id = Number(route.params.id)
  const result = await store.generateTestCases(id)
  if (result.success) {
    ElMessage.success(`生成了 ${result.testCases.length} 条测试用例`)
    caseCount.value = result.testCases.length
  } else {
    ElMessage.error(result.error || '生成失败')
  }
}

function viewTestCases() {
  router.push(`/test-cases/${route.params.id}`)
}
</script>

<style scoped>
.requirement-detail { max-width: 1000px; margin: 0 auto; }
.detail-card { margin-top: 16px; margin-bottom: 16px; }
.raw-text { white-space: pre-wrap; font-size: 13px; max-height: 200px; overflow-y: auto; background: #f8f8f8; padding: 8px; border-radius: 4px; }
.fp-section { margin-bottom: 16px; }
.fp-block { margin-bottom: 20px; border-bottom: 1px dashed #ebeef5; padding-bottom: 12px; }
.fp-block:last-child { border-bottom: none; }
.fp-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 15px; }
.fp-desc { color: #606266; font-size: 13px; margin: 4px 0 8px 0; }
</style>
