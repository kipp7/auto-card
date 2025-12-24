<template>
  <div class="layout">
    <aside class="sidebar app-card">
      <div class="brand">
        <div class="brand-logo" aria-hidden="true">KC</div>
        <div class="brand-text">
          <div class="title">卡密交易平台</div>
          <div class="sub">管理端</div>
        </div>
      </div>
      <el-menu class="menu" :default-active="route.path" router>
        <el-menu-item index="/dashboard">仪表板</el-menu-item>
        <el-menu-item index="/products">卡密管理</el-menu-item>
        <el-menu-item index="/orders">交易管理</el-menu-item>
        <el-menu-item index="/announcements">公告管理</el-menu-item>
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/finance">财务统计</el-menu-item>
      </el-menu>
    </aside>

    <main class="main">
      <header class="topbar app-card">
        <div class="topbar-left">
          <div class="topbar-title">{{ pageTitle }}</div>
        </div>
        <div class="topbar-right">
          <span class="user-name">{{ userName }}</span>
          <el-button size="small" type="primary" plain @click="logout">退出</el-button>
        </div>
      </header>

      <div class="content">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const userName = ref(localStorage.getItem('adminUserName') || 'admin');

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/dashboard': '仪表板',
    '/products': '卡密管理',
    '/orders': '交易管理',
    '/announcements': '公告管理',
    '/users': '用户管理',
    '/finance': '财务统计',
  };
  return map[route.path] || '管理端';
});

function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUserName');
  router.replace('/login');
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 264px 1fr;
  gap: 18px;
  padding: 18px;
  min-height: 100vh;
}

.sidebar {
  padding: 14px;
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 10px;
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
  box-shadow: 0 16px 32px rgba(14, 165, 233, 0.2);
  user-select: none;
}

.brand-text {
  min-width: 0;
}

.title {
  font-weight: 700;
}

.sub {
  color: var(--app-muted);
  font-size: 12px;
  margin-top: 2px;
}

.menu {
  flex: 1;
  margin-top: 6px;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.topbar {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-title {
  font-weight: 800;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: var(--app-muted);
}

.content {
  min-width: 0;
}

:deep(.el-menu) {
  border-right: none;
  background: transparent;
}

:deep(.el-menu-item) {
  border-radius: 14px;
  margin: 6px 6px;
  height: 44px;
  line-height: 44px;
  color: rgba(15, 23, 42, 0.78);
}

:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.55);
}

:deep(.el-menu-item.is-active) {
  color: var(--app-text);
  background: rgba(14, 165, 233, 0.12);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    height: auto;
    position: static;
  }
}
</style>
