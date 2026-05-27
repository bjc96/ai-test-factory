<template>
  <div class="requirement-list">
    <div class="page-header">
      <h1 class="page-title">需求管理</h1>
      <el-button type="primary" @click="$router.push('/requirements/new')">
         新建需求
      </el-button>
    </div>

    <el-card v-if="requirements.length > 0">
      <el-table :data="requirements" style="width:100%">
        <el-table-column prop="title" label="需求名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/requirements/${row.id}`)">
              {{ row.title || '未命名需求' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'done' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">
              {{ row.status === 'done' ? '已完成' : row.status === 'failed' ? '失败' : row.status === 'analyzing' ? '分析中' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/requirements/${row.id}`)">详情</el-button>
            <el-button size="small" @click="$router.push(`/test-cases/${row.id}`)" v-if="row.status === 'done'">用例</el-button>
            <el-button size="small" type="danger" @click="deleteReq(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else description="暂无需求记录">
      <el-button type="primary" @click="$router.push('/requirements/new')">创建第一个需求</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const requirements = ref<any[]>([])

onMounted(async () => {
  requirements.value = await window.electronAPI.getRequirements()
})

async function deleteReq(id: number) {
  await ElMessageBox.confirm('确定删除该需求及其关联数据？', '确认', { type: 'warning' })
  await window.electronAPI.deleteRequirement(id)
  requirements.value = requirements.value.filter((r: any) => r.id !== id)
  ElMessage.success('删除成功')
}
</script>

<style scoped>
.requirement-list { max-width: 1100px; margin: 0 auto; }


</style>
