<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-dot"></span>
          <span class="logo-text">智能测试工场</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item" active-class="active">
          &#9703; 仪表盘
        </router-link>
        <router-link to="/requirements" class="nav-item" active-class="active">
          &#9776; 需求管理
        </router-link>
        <router-link to="/test-cases" class="nav-item" active-class="active">
          &#9776; 测试用例
        </router-link>
        <router-link to="/scripts" class="nav-item" active-class="active">
          &#9776; 脚本管理
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active">
          &#9881; 设置
        </router-link>
      </nav>
      <div class="sidebar-footer">v1.0.0</div>
    </aside>
    <main class="main-area">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 200px; background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; flex-shrink: 0; position: fixed;
  top: 0; left: 0; bottom: 0; z-index: 100;
}
.sidebar-header { padding: 18px 16px; border-bottom: 1px solid var(--border); }
.logo { display: flex; align-items: center; gap: 8px; }
.logo-dot { width: 8px; height: 8px; background: var(--green); border-radius: 50%; display: inline-block; }
.logo-text { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: 0.5px; }
.sidebar-nav { flex: 1; padding: 8px 0; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 16px;
  color: var(--muted); font-size: 13px; text-decoration: none;
  cursor: pointer; transition: all 0.15s; border-left: 2px solid transparent;
}
.nav-item:hover { color: var(--text); background: rgba(255,255,255,0.04); }
.nav-item.active {
  color: var(--text); background: rgba(129,140,248,0.08);
  border-left-color: var(--accent);
}
.sidebar-footer { padding: 10px 16px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); }
.main-area { margin-left: 200px; flex: 1; padding: 24px 28px; min-height: 100vh; }
</style>
