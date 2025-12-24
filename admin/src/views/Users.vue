<template>
  <div class="app-card p16">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="filters.username" placeholder="用户名" clearable style="max-width: 260px" />
        <el-select v-model="filters.type" placeholder="类型" clearable style="max-width: 160px">
          <el-option label="admin" value="admin" />
          <el-option label="mobile" value="mobile" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="max-width: 160px">
          <el-option label="enabled" value="enabled" />
          <el-option label="disabled" value="disabled" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" min-width="220" />
      <el-table-column prop="type" label="类型" width="120" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" type="warning" plain @click="toggle(row)">
            {{ row.status === 'enabled' ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" plain @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        @current-change="load"
        @size-change="onSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { deleteUser, listUsers, patchUserStatus, type User } from '../api/business';

const loading = ref(false);
const list = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filters = reactive({
  username: '',
  type: '' as '' | 'admin' | 'mobile',
  status: '' as '' | 'enabled' | 'disabled',
});

async function load() {
  loading.value = true;
  try {
    const data = await listUsers({
      page: page.value,
      pageSize: pageSize.value,
      username: filters.username || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    list.value = data.list;
    total.value = data.total;
  } catch (err: any) {
    ElMessage.error(err?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function onSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  load();
}

async function toggle(row: User) {
  const next = row.status === 'enabled' ? 'disabled' : 'enabled';
  try {
    await patchUserStatus(row.id, next);
    ElMessage.success('更新成功');
    load();
  } catch (err: any) {
    ElMessage.error(err?.message || '更新失败');
  }
}

async function remove(id: number) {
  try {
    await ElMessageBox.confirm('确认删除该用户？', '提示', { type: 'warning' });
    await deleteUser(id);
    ElMessage.success('删除成功');
    load();
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.message || '删除失败');
  }
}

onMounted(load);
</script>

<style scoped>
.p16 {
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
