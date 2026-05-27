<template>
  <div class="settings">
    <h1 class="page-title">设置</h1>

    <el-card class="settings-card">
      <template #header><span>Claude Code CLI 配置</span></template>
      <el-form label-width="140px">
        <el-form-item label="CLI 状态">
          <el-tag :type="claudeOk ? 'success' : 'danger'">
            {{ claudeOk ? '已连接' : '未检测到' }}
          </el-tag>
          <el-button size="small" @click="checkClaude" style="margin-left:8px">检测</el-button>
        </el-form-item>
        <el-form-item label="CLI 路径">
          <el-input v-model="settingsForm.claude_path" placeholder="claude（默认 PATH 中的命令）" />
        </el-form-item>
        <el-form-item label="超时时间(秒)">
          <el-input-number v-model="settingsForm.timeout" :min="30" :max="600" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header><span>输出配置</span></template>
      <el-form label-width="140px">
        <el-form-item label="输出目录">
          <el-input v-model="settingsForm.output_dir" placeholder="默认：我的文档/AI-Test-Factory" />
        </el-form-item>
        <el-form-item label="Playwright Base URL">
          <el-input v-model="settingsForm.base_url" placeholder="http://localhost:8080" />
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </el-card>

    <el-card class="settings-card">
      <template #header><span>关于</span></template>
      <el-descriptions :column="1">
        <el-descriptions-item label="应用名称">智能测试工场 AI Test Factory</el-descriptions-item>
        <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Electron + Vue 3 + SQLite + Claude Code CLI</el-descriptions-item>
        <el-descriptions-item label="功能">
          需求智能分析 → 测试用例生成 → 自动化脚本输出
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const claudeOk = ref(false)
const settingsForm = ref({
  claude_path: 'claude',
  timeout: 180,
  output_dir: '',
  base_url: 'http://localhost:8080'
})

onMounted(async () => {
  const settings = await window.electronAPI.getSettings()
  if (settings.claude_path) settingsForm.value.claude_path = settings.claude_path
  if (settings.timeout) settingsForm.value.timeout = Number(settings.timeout)
  if (settings.output_dir) settingsForm.value.output_dir = settings.output_dir
  if (settings.base_url) settingsForm.value.base_url = settings.base_url
  await checkClaude()
})

async function checkClaude() {
  try {
    const result = await window.electronAPI.getSettings()
    claudeOk.value = result.claude_available === 'true'
  } catch {
    claudeOk.value = false
  }
}

async function saveSettings() {
  await window.electronAPI.saveSettings(settingsForm.value)
  ElMessage.success('设置已保存')
}
</script>

<style scoped>
.settings { max-width: 800px; margin: 0 auto; }
.page-title { font-size: 24px; margin-bottom: 20px; color: #303133; }
.settings-card { margin-bottom: 16px; }
</style>
