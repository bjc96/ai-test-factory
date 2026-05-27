<template>
  <div class="script-list">
    <div class="page-header">
      <h1 class="page-title">脚本管理</h1>
    </div>

    <el-card v-if="requirements.length > 0">
      <el-table :data="requirements" style="width:100%">
        <el-table-column prop="title" label="需求名称" min-width="200" />
        <el-table-column label="脚本数" width="100">
          <template #default="{ row }">{{ row.scriptCount || 0 }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="$router.push(`/scripts/${row.id}`)">查看脚本</el-button>
            <el-button size="small" @click="openFolder(row)">打开目录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else description="暂无脚本">
      <el-button type="primary" @click="$router.push('/requirements')">查看需求</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const requirements = ref<any[]>([])

onMounted(async () => {
  const reqs = await window.electronAPI.getRequirements()
  for (const req of reqs) {
    if (req.status === 'done') {
      const scripts = await window.electronAPI.getScripts(req.id)
      req.scriptCount = scripts.length
      req.latestDir = scripts.length > 0 ? scripts[scripts.length - 1].file_path : ''
      requirements.value.push(req)
    }
  }
})

async function openFolder(row: any) {
  if (row.latestDir) {
    await window.electronAPI.openFolder(row.latestDir)
  }
}
</script>

<style scoped>
.script-list { max-width: 1000px; margin: 0 auto; }


</style>
