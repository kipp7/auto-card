<template>
  <div class="wrap">
    <div class="card app-card">
      <div class="left">
        <div class="left-inner">
          <div class="title">卡密交易平台</div>
          <div class="sub">管理端登录</div>
        </div>
      </div>
      <div class="right">
        <el-form :model="form" label-position="top" @submit.prevent>
          <el-form-item label="用户名">
            <el-input v-model="form.username" autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
          </el-form-item>
          <el-button type="primary" class="w100" :loading="loading" @click="onSubmit">登录</el-button>
          <div class="hint">默认账号：admin / admin123（可在数据库中修改）。</div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { login } from '../api/auth';

const router = useRouter();
const route = useRoute();
const loading = ref(false);

const form = reactive({
  username: 'admin',
  password: 'admin123',
});

async function onSubmit() {
  if (!form.username || !form.password) {
    ElMessage.error('请输入用户名和密码');
    return;
  }

  loading.value = true;
  try {
    const data = await login({ username: form.username, password: form.password });
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUserName', data.username);
    ElMessage.success('登录成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    router.replace(redirect);
  } catch (err: any) {
    ElMessage.error(err?.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.card {
  width: min(960px, 100%);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.left {
  background: rgba(255, 255, 255, 0.75);
  border-right: 1px solid var(--app-border);
}

.left-inner {
  height: 100%;
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: var(--app-text);
  background: radial-gradient(620px 360px at 20% 20%, rgba(14, 165, 233, 0.18), transparent 60%),
    radial-gradient(620px 360px at 90% 40%, rgba(249, 115, 22, 0.16), transparent 60%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(248, 250, 252, 0.72));
}

.title {
  font-weight: 800;
  font-size: 20px;
}

.sub {
  margin-top: 6px;
  color: var(--app-muted);
}

.right {
  padding: 32px;
}

.w100 {
  width: 100%;
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
}

@media (max-width: 900px) {
  .card {
    grid-template-columns: 1fr;
  }
  .left {
    border-right: none;
    border-bottom: 1px solid var(--app-border);
  }
}
</style>
