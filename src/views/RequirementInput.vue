<template>
  <div class="requirement-input">
    <el-page-header @back="$router.push('/requirements')" content="新建需求分析" />

    <el-card class="input-card">
      <el-form>
        <el-form-item label="需求文本">
          <el-input
            v-model="requirementText"
            type="textarea"
            :rows="12"
            placeholder="请粘贴或输入需求文本，例如：&#10;&#10;登录模块的登录功能：&#10;1. 用户输入正确的用户名和密码，点击登录按钮，可以成功登录系统，并跳转到首页&#10;2. 用户输入错误的用户名或密码，点击登录按钮，提示「用户名或密码错误」&#10;3. 用户不输入任何信息，点击登录按钮，提示「请输入用户名和密码」&#10;4. 连续5次输入错误密码，账号锁定30分钟&#10;5. 登录时需要输入图形验证码，验证码输入错误提示刷新重试&#10;&#10;登录模块的注册功能：&#10;1. 用户点击注册按钮，填写用户名、密码、确认密码、手机号&#10;2. 用户名已存在时提示「用户名已被注册」&#10;3. 两次密码不一致时提示「密码不一致」"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" @click="startAnalysis" :loading="loading" :disabled="!requirementText.trim()">
            
            {{ loading ? 'AI 正在分析中...' : '开始智能分析' }}
          </el-button>
          <el-button size="large" @click="$router.push('/requirements')">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 示例导入 -->
    <el-card class="example-card">
      <template #header>
        <span>快速示例</span>
      </template>
      <el-collapse>
        <el-collapse-item title="示例1：登录功能需求" name="1">
          <p>点击下方按钮直接填充示例文本，体验完整流程。</p>
          <el-button type="text" @click="loadLoginExample">加载登录示例</el-button>
        </el-collapse-item>
        <el-collapse-item title="示例2：文件上传功能需求" name="2">
          <el-button type="text" @click="loadUploadExample">加载文件上传示例</el-button>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <!-- 分析结果 -->
    <div v-if="functionPoints.length > 0" class="result-section">
      <el-alert
        :title="`分析完成：共 ${functionPoints.length} 个功能点，${totalTestPoints} 个测试点`"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom:16px"
      />

      <el-card v-for="(fp, fpIdx) in functionPoints" :key="fpIdx" class="fp-card">
        <template #header>
          <div class="fp-header">
            <span class="fp-name">{{ fp.seqNo }}. {{ fp.name }}</span>
            <el-tag :type="getCategoryTag(fp.category)" size="small">{{ fp.category }}</el-tag>
            <el-tag :type="getRiskTag(fp.riskLevel)" size="small">{{ fp.riskLevel }}</el-tag>
          </div>
        </template>
        <p class="fp-desc">{{ fp.description }}</p>
        <el-table :data="fp.testPoints" size="small" style="margin-top:8px">
          <el-table-column prop="seqNo" label="序号" width="60" />
          <el-table-column prop="name" label="测试点" />
          <el-table-column prop="testType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag size="small">{{ getTestTypeLabel(row.testType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="preconditions" label="前置条件" width="200" />
        </el-table>
      </el-card>

      <div class="action-bar">
        <el-button type="primary" size="large" @click="goToGenerateCases" :loading="loading">
           生成测试用例
        </el-button>
        <el-button size="large" @click="$router.push('/requirements')">保存并返回列表</el-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="'分析失败：' + error"
      type="error"
      show-icon
      :closable="false"
      style="margin-top:16px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRequirementStore, FunctionPoint } from '../stores/requirement'

const router = useRouter()
const store = useRequirementStore()

const requirementText = ref('')
const loading = computed(() => store.loading)
const error = computed(() => store.error)
const functionPoints = computed(() => store.functionPoints)
const totalTestPoints = computed(() =>
  store.functionPoints.reduce((sum, fp) => sum + (fp.testPoints?.length || 0), 0)
)

async function startAnalysis() {
  const result = await store.analyzeRequirement(requirementText.value)
  if (result.success) {
    ElMessage.success('需求分析完成！')
  } else {
    ElMessage.error(result.error || '分析失败')
  }
}

async function goToGenerateCases() {
  const reqId = store.currentRequirement?.id
  if (!reqId) return
  const result = await store.generateTestCases(reqId)
  if (result.success) {
    ElMessage.success(`生成了 ${result.testCases.length} 条测试用例`)
    router.push(`/test-cases/${reqId}`)
  } else {
    let errMsg = result.error || '生成失败'
    if (result.diag) {
      errMsg += ` [诊断: ${result.diag.fpsCount}功能点, ${result.diag.tpsCount}测试点, 返回类型${result.diag.resultType}]`
    }
    ElMessage.error(errMsg)
  }
}

function getCategoryTag(cat: string) {
  const map: Record<string, string> = { '功能类': '', '界面类': 'success', '权限类': 'warning', '数据类': 'info', '安全类': 'danger' }
  return map[cat] || ''
}

function getRiskTag(level: string) {
  const map: Record<string, string> = { 'HIGH': 'danger', 'MEDIUM': 'warning', 'LOW': 'info' }
  return map[level] || 'info'
}

function getTestTypeLabel(type: string) {
  const map: Record<string, string> = { positive: '正向', negative: '异常', boundary: '边界', exception: '异常' }
  return map[type] || type
}

function loadLoginExample() {
  requirementText.value = `登录模块功能需求：

1. 登录功能：
   - 用户输入正确的用户名和密码，点击登录按钮，成功登录并跳转首页
   - 用户输入错误的用户名或密码，点击登录按钮，提示"用户名或密码错误"
   - 用户不输入用户名和密码，点击登录按钮，提示"请输入用户名和密码"
   - 连续5次输入错误密码，账号锁定30分钟，提示"账号已被锁定"

2. 图形验证码：
   - 登录页面显示图形验证码
   - 验证码输入错误提示"验证码错误，请重新输入"
   - 点击验证码图片可刷新验证码

3. 注册功能：
   - 用户点击注册，填写用户名、密码、确认密码、手机号
   - 用户名已存在时提示"用户名已被注册"
   - 两次密码输入不一致时提示"两次密码不一致"
   - 手机号格式不正确时提示"请输入正确的手机号"

4. 记住密码功能：
   - 用户勾选"记住密码"，下次打开页面自动填充用户名和密码

5. 忘记密码：
   - 点击忘记密码，通过手机验证码重置密码`
}

function loadUploadExample() {
  requirementText.value = `文件上传功能需求：

1. 文件上传：
   - 支持上传单个文件，文件大小不超过 100MB
   - 支持上传多个文件（批量上传），一次最多 10 个文件
   - 上传时显示进度条
   - 上传完成后显示文件列表
   - 文件名为空时提示"请选择文件"
   - 文件超过 100MB 时提示"文件大小不能超过100MB"
   - 上传数量超过 10 个时提示"一次最多上传10个文件"

2. 文件格式限制：
   - 允许上传的文件格式：jpg, png, pdf, doc, docx, xls, xlsx, zip, rar
   - 上传不支持的文件格式时提示"不支持该文件格式"
   - 上传空文件（0字节）时提示"不能上传空文件"

3. 断点续传：
   - 网络中断后恢复上传，可以从断点处继续上传
   - 上传相同的文件时提示"文件已存在，是否覆盖？"

4. 文件分类：
   - 上传文件时可以选择文件分类（文档、图片、视频、其他）
   - 没有选择分类时默认分类为"其他"`
}
</script>

<style scoped>


.example-card { margin-bottom: 16px; }
.result-section { margin-top: 16px; }
.fp-card { margin-bottom: 12px; }
.fp-header { display: flex; align-items: center; gap: 8px; }
.fp-name { font-weight: 600; font-size: 15px; }
.fp-desc { color:var(--text2); margin: 4px 0; font-size: 13px; }
.action-bar { margin-top: 20px; display: flex; gap: 12px; }
</style>
