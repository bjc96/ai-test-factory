<template>
  <div class="dashboard">
    <div class="topbar">
      <div>
        <h2>仪表盘</h2>
        <div class="subtitle" v-if="claudePath">Claude CLI · {{ claudePath.split('/').pop() || claudePath.split('\\').pop() }}</div>
      </div>
      <div class="topbar-actions">
        <span class="status-dot" :class="{ on: claudeAvailable }"></span>
        <span style="font-size:13px;color:var(--muted)">{{ claudeAvailable ? 'Claude 已连接' : 'Claude 未连接' }}</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card clickable" @click="$router.push('/requirements/new')">
        <div class="stat-value accent">{{ stats.totalRequirements }}</div>
        <div class="stat-label">需求总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value green">{{ stats.totalTestCases }}</div>
        <div class="stat-label">测试用例</div>
      </div>
      <div class="stat-card">
        <div class="stat-value amber">{{ stats.totalScripts }}</div>
        <div class="stat-label">生成脚本</div>
      </div>
      <div class="stat-card" :class="{ connected: claudeAvailable }">
        <div class="stat-value" :class="{ green: claudeAvailable }">{{ claudeAvailable ? '已连接' : '未连接' }}</div>
        <div class="stat-label">Claude CLI</div>
      </div>
    </div>

    <div class="section-title">快捷操作</div>
    <div class="actions-row">
      <button class="action-btn primary" @click="$router.push('/requirements/new')">新建需求分析</button>
      <button class="action-btn" @click="handleImportExcel">导入测试用例 Excel</button>
      <button class="action-btn" @click="$router.push('/requirements')">查看需求历史</button>
    </div>

    <div class="section-title">示例需求文档（点击直接分析）</div>
    <div class="samples-grid">
      <div class="sample-card" v-for="s in samples" :key="s.name" @click="loadSample(s)">
        <div class="sample-name">{{ s.name }}</div>
        <div class="sample-meta">{{ s.text.length }} 字符</div>
      </div>
    </div>

    <div class="section-title" v-if="recentRequirements.length">最近需求</div>
    <div class="table-wrap" v-if="recentRequirements.length">
      <table>
        <thead><tr><th>需求名称</th><th>状态</th><th>创建时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in recentRequirements" :key="r.id">
            <td class="name-cell">{{ r.title || '未命名' }}</td>
            <td><span class="tag" :class="r.status">{{ r.status === 'done' ? '已完成' : r.status === 'failed' ? '失败' : '分析中' }}</span></td>
            <td class="meta-cell">{{ r.created_at?.slice(0,10) }}</td>
            <td><button class="action-btn" @click="$router.push(`/requirements/${r.id}`)">查看</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const stats = ref({ totalRequirements: 0, totalTestCases: 0, totalScripts: 0 })
const claudeAvailable = ref(false)
const claudePath = ref('')
const recentRequirements = ref<any[]>([])
const samples = ref<{name:string;text:string}[]>([])

onMounted(async () => {
  samples.value = await window.electronAPI.getSamples()
  const reqs = await window.electronAPI.getRequirements()
  stats.value.totalRequirements = reqs.length
  recentRequirements.value = reqs.slice(0, 5)
  try {
    const result = await window.electronAPI.checkClaude()
    claudeAvailable.value = result.available
    claudePath.value = result.resolvedPath
  } catch {}
  try {
    const tcs = await Promise.all(reqs.map((r:any) => window.electronAPI.getTestCases(r.id)))
    stats.value.totalTestCases = tcs.reduce((s:any, c:any) => s + c.length, 0)
    const scs = await Promise.all(reqs.map((r:any) => window.electronAPI.getScripts(r.id)))
    stats.value.totalScripts = scs.reduce((s:any, c:any) => s + c.length, 0)
  } catch {}
})

async function handleImportExcel() {
  const result = await window.electronAPI.importExcel()
  if (result.success) ElMessage.success(`导入 ${result.importedCount} 条用例`)
  else ElMessage.error(result.error || '导入失败')
}

async function loadSample(s: {name:string;text:string}) {
  ElMessage.info(`正在分析「${s.name}」...`)
  const result = await window.electronAPI.analyzeRequirement(s.text)
  if (result.success) { ElMessage.success(`「${s.name}」分析完成`); router.push(`/requirements/${result.requirementId}`) }
  else ElMessage.error(result.error || '分析失败')
}
</script>

<style scoped>
.dashboard { max-width: 960px; }
.topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.topbar h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
.subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); display: inline-block; }
.status-dot.on { background: var(--green); }
.stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }
.stat-card.clickable { cursor: pointer; transition: border-color .15s; }
.stat-card.clickable:hover { border-color: var(--accent); }
.stat-value { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.stat-value.accent { color: var(--accent); } .stat-value.green { color: var(--green); } .stat-value.amber { color: var(--amber); }
.stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; margin-top: 20px; }
.actions-row { display: flex; gap: 10px; margin-bottom: 8px; }
.action-btn { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 13px; cursor: pointer; transition: all .15s; font-family: inherit; }
.action-btn:hover { background: var(--surface2); }
.action-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.action-btn.primary:hover { opacity: 0.85; }
.samples-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.sample-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; cursor: pointer; transition: all .15s; }
.sample-card:hover { border-color: var(--accent); background: var(--surface2); }
.sample-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.sample-meta { font-size: 12px; color: var(--muted); }
.table-wrap { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; background: rgba(15,23,42,0.4); border-bottom: 1px solid var(--border); }
td { padding: 10px 14px; border-bottom: 1px solid rgba(51,65,85,0.4); }
tr:hover td { background: var(--surface2); }
.name-cell { font-weight: 500; }
.meta-cell { color: var(--muted); font-size: 12px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.tag.done { background: rgba(52,211,153,.15); color: var(--green); }
.tag.failed { background: rgba(248,113,113,.15); color: var(--red); }
.tag.analyzing, .tag.pending { background: rgba(251,191,36,.15); color: var(--amber); }
</style>
