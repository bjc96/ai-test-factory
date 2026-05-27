<template>
  <el-container class="app-container">
    <el-aside width="200px" class="app-sidebar">
      <div class="logo">
        <h2>智能测试工场</h2>
      </div>
      <el-menu
        :default-active="currentRoute"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/requirements">
          
          <span>需求管理</span>
        </el-menu-item>
        <el-menu-item index="/test-cases">
          
          <span>测试用例</span>
        </el-menu-item>
        <el-menu-item index="/scripts">
          
          <span>脚本管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentRoute = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  background: #f0f2f5;
}
.app-container {
  height: 100vh;
}
.app-sidebar {
  background-color: #304156;
  overflow-y: auto;
}
.app-sidebar .logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-sidebar .logo h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}
.app-main {
  padding: 20px;
  overflow-y: auto;
  background: #f0f2f5;
}
</style>
