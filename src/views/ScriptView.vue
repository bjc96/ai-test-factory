<template>
  <div class="script-view">
    <el-page-header @back="$router.push(`/test-cases/${requirementId}`)" content="自动化脚本管理" />

    <el-card class="toolbar-card">
      <el-space>
        <el-button type="primary" @click="generateScripts" :loading="generating">
           {{ scripts.length > 0 ? '重新生成脚本' : '生成 Playwright 脚本' }}
        </el-button>
        <el-button type="success" @click="openScriptFolder" :disabled="!currentDir">
           打开脚本目录
        </el-button>
        <el-button type="warning" @click="runScript" :disabled="!currentDir">
           运行测试
        </el-button>
      </el-space>
    </el-card>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:16px"
      v-if="scripts.length > 0"
    >
      脚本已生成到: <code>{{ currentDir }}</code>
    </el-alert>

    <!-- 脚本文件列表 -->
    <el-card v-if="scripts.length > 0">
      <template #header><span>生成的文件</span></template>
      <el-table :data="scripts" style="width:100%">
        <el-table-column prop="file_name" label="文件名" />
        <el-table-column prop="artifact_type" label="类型" width="180" />
        <el-table-column prop="created_at" label="生成时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="openScriptFolder">打开目录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-if="!generating && scripts.length === 0" description="暂无生成的脚本">
      <el-button type="primary" @click="generateScripts">生成 Playwright 脚本</el-button>
    </el-empty>

    <!-- 加载中 -->
    <div v-if="generating" style="text-align:center;padding:40px">
      
      <p style="margin-top:12px;color:#909399">正在生成 Playwright 脚本，请稍候...</p>
      <p style="color:#909399;font-size:12px">这可能需要 1-3 分钟</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const requirementId = computed(() => Number(route.params.requirementId))
const scripts = ref<any[]>([])
const currentDir = ref('')
const generating = ref(false)

onMounted(async () => {
  scripts.value = await window.electronAPI.getScripts(requirementId.value)
  if (scripts.value.length > 0) {
    currentDir.value = scripts.value[0].file_path
  }
})

async function generateScripts() {
  generating.value = true
  try {
    const result = await window.electronAPI.generateScripts(requirementId.value)
    if (result.success) {
      currentDir.value = result.outputDir
      ElMessage.success(`脚本生成成功，共 ${result.fileCount} 个文件`)
      scripts.value = await window.electronAPI.getScripts(requirementId.value)
    } else {
      ElMessage.error(result.error || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

async function openScriptFolder() {
  if (currentDir.value) {
    await window.electronAPI.openFolder(currentDir.value)
  }
}

async function runScript() {
  if (currentDir.value) {
    await window.electronAPI.runScript(currentDir.value)
    ElMessage.info('已在终端中打开测试运行')
  }
}
</script>

<style scoped>
.script-view { max-width: 1000px; margin: 0 auto; }
.toolbar-card { margin-top: 16px; margin-bottom: 16px; }
code { background: #f0f2f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
</style>
