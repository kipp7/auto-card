<template>
  <div class="app-card p16">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="filters.title" placeholder="标题" clearable style="max-width: 260px" />
        <el-select v-model="filters.status" placeholder="状态" clearable style="max-width: 180px">
          <el-option label="published" value="published" />
          <el-option label="draft" value="draft" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>
      <el-button type="primary" plain @click="openCreate">新增公告</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
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

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑公告' : '新增公告'" width="720px">
    <el-form :model="form" label-position="top">
      <el-form-item label="标题">
        <el-input v-model="form.title" placeholder="必填" />
      </el-form-item>
      <el-form-item label="内容(支持HTML)">
        <el-input v-model="form.content" type="textarea" :rows="6" placeholder="必填" />
      </el-form-item>
      <div class="grid2">
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="published" value="published" />
            <el-option label="draft" value="draft" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  type Announcement,
  updateAnnouncement,
} from '../api/business';

const loading = ref(false);
const saving = ref(false);
const list = ref<Announcement[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filters = reactive({
  title: '',
  status: '' as '' | 'published' | 'draft',
});

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  title: '',
  content: '',
  status: 'published' as 'published' | 'draft',
  sort: 0,
});

function resetForm() {
  form.title = '';
  form.content = '';
  form.status = 'published';
  form.sort = 0;
}

async function load() {
  loading.value = true;
  try {
    const data = await listAnnouncements({
      page: page.value,
      pageSize: pageSize.value,
      title: filters.title || undefined,
      status: filters.status || undefined,
      sortBy: 'sort',
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

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: Announcement) {
  editingId.value = row.id;
  form.title = row.title;
  form.content = row.content;
  form.status = row.status;
  form.sort = row.sort;
  dialogVisible.value = true;
}

async function save() {
  if (!form.title || !form.content) {
    ElMessage.error('标题/内容必填');
    return;
  }

  saving.value = true;
  try {
    const payload = { title: form.title, content: form.content, status: form.status, sort: form.sort };
    if (editingId.value) await updateAnnouncement(editingId.value, payload);
    else await createAnnouncement(payload);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    load();
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  try {
    await ElMessageBox.confirm('确认删除该公告？', '提示', { type: 'warning' });
    await deleteAnnouncement(id);
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

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
