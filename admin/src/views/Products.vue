<template>
  <div class="app-card p16">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="filters.name" placeholder="卡密名称" clearable style="max-width: 260px" />
        <el-input v-model="filters.category" placeholder="分类" clearable style="max-width: 220px" />
        <el-select v-model="filters.status" placeholder="状态" clearable style="max-width: 160px">
          <el-option label="上架" value="online" />
          <el-option label="下架" value="offline" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>
      <el-button type="primary" plain @click="openCreate">新增卡密</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="140" />
      <el-table-column prop="price" label="售价" width="120" />
      <el-table-column label="活动价" width="170">
        <template #default="{ row }">
          <div class="promo-cell">
            <span>{{ row.promoPrice ? `￥${row.promoPrice}` : '-' }}</span>
            <el-tag v-if="row.promoPrice" :type="row.promoActive ? 'success' : 'info'" size="small">
              {{ row.promoActive ? '进行中' : '未启用' }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="库存" min-width="180">
        <template #default="{ row }">
          <div class="stock-row">
            <span class="stock-pill available">可用 {{ row.stockAvailable ?? 0 }}</span>
            <span class="stock-pill reserved">预占 {{ row.stockReserved ?? 0 }}</span>
            <span class="stock-pill sold">已售 {{ row.stockSold ?? 0 }}</span>
          </div>
          <div class="stock-total">总量 {{ row.stockTotal ?? 0 }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="followers" label="成交" width="100" />
      <el-table-column prop="likes" label="收藏" width="100" />
      <el-table-column label="实名" width="90">
        <template #default="{ row }">
          <el-tag :type="row.isRealName ? 'success' : 'info'">{{ row.isRealName ? '已实名' : '未实名' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'warning'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row.id)">编辑</el-button>
          <el-button size="small" type="info" plain @click="openStock(row)">库存</el-button>
          <el-button size="small" type="warning" @click="toggleStatus(row)">
            {{ row.status === 'online' ? '下架' : '上架' }}
          </el-button>
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

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑卡密' : '新增卡密'" width="720px">
    <el-form :model="form" label-position="top">
      <div class="form-grid">
        <el-form-item label="名称" class="span2">
          <el-input v-model="form.name" placeholder="必填" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="form.category" placeholder="必填" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="上架" value="online" />
            <el-option label="下架" value="offline" />
          </el-select>
        </el-form-item>

        <el-form-item label="售价">
          <el-input v-model="form.price" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input v-model="form.originalPrice" />
        </el-form-item>
        <el-form-item label="活动价">
          <el-input v-model="form.promoPrice" placeholder="可选" />
        </el-form-item>
        <el-form-item label="活动开始">
          <el-date-picker v-model="form.promoStartAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="活动结束">
          <el-date-picker v-model="form.promoEndAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="成交数">
          <el-input-number v-model="form.followers" :min="0" :max="99999999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="收藏数">
          <el-input-number v-model="form.likes" :min="0" :max="99999999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否实名">
          <el-switch v-model="form.isRealName" />
        </el-form-item>
        <el-form-item label="主图URL" class="span2">
          <el-input v-model="form.mainImage" />
        </el-form-item>
        <el-form-item label="截图URL" class="span2">
          <el-input v-model="form.screenshot" />
        </el-form-item>

        <el-form-item label="简介" class="span2">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始库存（每行一条卡密）" class="span2">
          <el-input v-model="form.cardNumber" type="textarea" :rows="3" placeholder="可选，创建时导入库存" />
        </el-form-item>
        <el-form-item v-else label="库存管理" class="span2">
          <div class="form-tip">库存已独立管理，请在列表点击“库存”进行导入与维护。</div>
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="stockVisible" :title="stockTitle" width="980px">
    <div class="stock-header">
      <div class="stock-summary">
        <span class="stock-badge available">可用 {{ stockSummary.stockAvailable }}</span>
        <span class="stock-badge reserved">预占 {{ stockSummary.stockReserved }}</span>
        <span class="stock-badge sold">已售 {{ stockSummary.stockSold }}</span>
        <span class="stock-badge total">总量 {{ stockSummary.stockTotal }}</span>
      </div>
      <div class="stock-filters">
        <el-select v-model="stockFilters.status" placeholder="状态" clearable style="width: 140px">
          <el-option label="可用" value="available" />
          <el-option label="预占" value="reserved" />
          <el-option label="已售" value="sold" />
        </el-select>
        <el-input v-model="stockFilters.keyword" placeholder="卡密关键词" clearable style="width: 220px" />
        <el-button type="primary" @click="loadStock">查询</el-button>
      </div>
    </div>

    <div class="stock-import">
      <div class="stock-import-title">批量导入卡密（每行一条）</div>
      <el-input v-model="stockImportText" type="textarea" :rows="4" placeholder="支持粘贴多行卡密" />
      <div class="stock-import-actions">
        <el-button type="primary" :loading="stockImporting" @click="submitStockImport">导入库存</el-button>
        <span v-if="stockImportTip" class="stock-tip">{{ stockImportTip }}</span>
      </div>
      <div v-if="stockImportSummary.attempted" class="stock-import-summary">
        <span class="stock-chip">尝试 {{ stockImportSummary.attempted }}</span>
        <span class="stock-chip success">成功 {{ stockImportSummary.inserted }}</span>
        <span class="stock-chip warn">跳过 {{ stockImportSummary.skipped }}</span>
        <span class="stock-chip">超长 {{ stockImportSummary.invalid }}</span>
        <span class="stock-chip">重复 {{ stockImportSummary.duplicate }}</span>
        <span class="stock-chip">已存在 {{ stockImportSummary.existed }}</span>
        <span class="stock-chip">超上限 {{ stockImportSummary.overLimit }}</span>
        <el-button
          v-if="stockImportErrors.length"
          size="small"
          type="info"
          plain
          @click="exportStockImportErrors"
        >
          导出失败清单
        </el-button>
      </div>
      <div v-if="stockImportErrors.length" class="stock-import-errors">
        <div class="stock-import-errors-title">失败明细（{{ stockImportErrors.length }}）</div>
        <el-table :data="stockImportErrors.slice(0, 50)" stripe size="small" style="width: 100%">
          <el-table-column prop="cardNumber" label="卡密" min-width="240" show-overflow-tooltip />
          <el-table-column prop="reason" label="原因" width="140" />
        </el-table>
        <div class="stock-tip">仅展示前 50 条，详情可导出 CSV。</div>
      </div>
    </div>

    <el-table :data="stockList" v-loading="stockLoading" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="cardNumber" label="卡密" min-width="240" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 'available' ? 'success' : row.status === 'reserved' ? 'warning' : 'info'">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reservedOrderId" label="预占订单" width="120" />
      <el-table-column prop="soldOrderId" label="售出订单" width="120" />
      <el-table-column prop="reservedAt" label="预占时间" width="170" />
      <el-table-column prop="soldAt" label="售出时间" width="170" />
      <el-table-column prop="createdAt" label="入库时间" width="170" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain :disabled="row.status !== 'available'" @click="removeStock(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="stockPage"
        v-model:page-size="stockPageSize"
        :total="stockTotal"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="loadStock"
        @size-change="onStockSizeChange"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createProduct,
  deleteProduct,
  deleteProductStock,
  getProduct,
  getProductStock,
  importProductStock,
  listProducts,
  patchProductStatus,
  type Product,
  type ProductStockItem,
  type ProductStockSummary,
  updateProduct,
} from '../api/business';

const loading = ref(false);
const saving = ref(false);
const list = ref<Product[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const stockVisible = ref(false);
const stockLoading = ref(false);
const stockList = ref<ProductStockItem[]>([]);
const stockTotal = ref(0);
const stockPage = ref(1);
const stockPageSize = ref(20);
const stockProduct = ref<Product | null>(null);
const stockImportText = ref('');
const stockImporting = ref(false);
const stockImportTip = ref('');
const stockImportErrors = ref<Array<{ cardNumber: string; reason: string }>>([]);
const stockImportSummary = reactive({
  attempted: 0,
  inserted: 0,
  skipped: 0,
  invalid: 0,
  duplicate: 0,
  existed: 0,
  overLimit: 0,
});
const stockSummary = reactive<ProductStockSummary>({
  stockAvailable: 0,
  stockReserved: 0,
  stockSold: 0,
  stockTotal: 0,
});

const stockFilters = reactive({
  status: '' as '' | 'available' | 'reserved' | 'sold',
  keyword: '',
});

const stockTitle = computed(() => (stockProduct.value ? `库存管理 · ${stockProduct.value.name}` : '库存管理'));

const filters = reactive({
  name: '',
  category: '',
  status: '' as '' | 'online' | 'offline',
});

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  name: '',
  category: '',
  status: 'online' as 'online' | 'offline',
  price: '0.00',
  originalPrice: '',
  promoPrice: '',
  promoStartAt: '',
  promoEndAt: '',
  followers: 0,
  likes: 0,
  isRealName: false,
  mainImage: '',
  screenshot: '',
  description: '',
  cardNumber: '',
});

function resetForm() {
  form.name = '';
  form.category = '';
  form.status = 'online';
  form.price = '0.00';
  form.originalPrice = '';
  form.promoPrice = '';
  form.promoStartAt = '';
  form.promoEndAt = '';
  form.followers = 0;
  form.likes = 0;
  form.isRealName = false;
  form.mainImage = '';
  form.screenshot = '';
  form.description = '';
  form.cardNumber = '';
}

function resetStockImportSummary() {
  stockImportSummary.attempted = 0;
  stockImportSummary.inserted = 0;
  stockImportSummary.skipped = 0;
  stockImportSummary.invalid = 0;
  stockImportSummary.duplicate = 0;
  stockImportSummary.existed = 0;
  stockImportSummary.overLimit = 0;
  stockImportErrors.value = [];
  stockImportTip.value = '';
}

function applyStockSummary(source?: Partial<ProductStockSummary>) {
  stockSummary.stockAvailable = Number(source?.stockAvailable) || 0;
  stockSummary.stockReserved = Number(source?.stockReserved) || 0;
  stockSummary.stockSold = Number(source?.stockSold) || 0;
  stockSummary.stockTotal = Number(source?.stockTotal) || 0;
}

function updateProductStock(productId: number, summary: Partial<ProductStockSummary>) {
  const idx = list.value.findIndex((item) => item.id === productId);
  if (idx < 0) return;
  list.value[idx] = {
    ...list.value[idx],
    stockAvailable: summary.stockAvailable ?? list.value[idx].stockAvailable ?? 0,
    stockReserved: summary.stockReserved ?? list.value[idx].stockReserved ?? 0,
    stockSold: summary.stockSold ?? list.value[idx].stockSold ?? 0,
    stockTotal: summary.stockTotal ?? list.value[idx].stockTotal ?? 0,
  };
}

function formatTimestamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function exportStockImportErrors() {
  if (!stockImportErrors.value.length) return;
  const header = 'cardNumber,reason';
  const lines = stockImportErrors.value.map(
    (item) => `"${String(item.cardNumber || '').replace(/\"/g, '""')}","${String(item.reason || '').replace(/\"/g, '""')}"`,
  );
  const content = '\ufeff' + [header, ...lines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stock-import-errors-${formatTimestamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function load() {
  loading.value = true;
  try {
    const data = await listProducts({
      page: page.value,
      pageSize: pageSize.value,
      name: filters.name || undefined,
      category: filters.category || undefined,
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

async function loadStock() {
  if (!stockProduct.value) return;
  stockLoading.value = true;
  try {
    const data = await getProductStock(stockProduct.value.id, {
      page: stockPage.value,
      pageSize: stockPageSize.value,
      status: stockFilters.status || undefined,
      keyword: stockFilters.keyword || undefined,
    });
    stockList.value = data.list;
    stockTotal.value = data.total;
  } catch (err: any) {
    ElMessage.error(err?.message || '库存加载失败');
  } finally {
    stockLoading.value = false;
  }
}

function onStockSizeChange(size: number) {
  stockPageSize.value = size;
  stockPage.value = 1;
  loadStock();
}

async function refreshStockSummary(productId: number) {
  try {
    const detail = await getProduct(productId);
    const summary = {
      stockAvailable: detail.stockAvailable ?? 0,
      stockReserved: detail.stockReserved ?? 0,
      stockSold: detail.stockSold ?? 0,
      stockTotal: detail.stockTotal ?? 0,
    };
    updateProductStock(productId, summary);
    if (stockProduct.value && stockProduct.value.id === productId) {
      applyStockSummary(summary);
    }
  } catch {
    // ignore
  }
}

function openStock(row: Product) {
  stockProduct.value = row;
  applyStockSummary({
    stockAvailable: row.stockAvailable ?? 0,
    stockReserved: row.stockReserved ?? 0,
    stockSold: row.stockSold ?? 0,
    stockTotal: row.stockTotal ?? 0,
  });
  stockFilters.status = '';
  stockFilters.keyword = '';
  stockPage.value = 1;
  stockImportText.value = '';
  resetStockImportSummary();
  stockVisible.value = true;
  loadStock();
}

async function submitStockImport() {
  if (!stockProduct.value) return;
  const text = stockImportText.value.trim();
  if (!text) {
    ElMessage.error('请输入卡密');
    return;
  }
  resetStockImportSummary();
  stockImporting.value = true;
  try {
    const result = await importProductStock(stockProduct.value.id, { cardsText: text });
    stockImportText.value = '';
    stockImportSummary.attempted = result.attempted || 0;
    stockImportSummary.inserted = result.inserted || 0;
    stockImportSummary.skipped = result.skipped || 0;
    stockImportSummary.invalid = result.summary?.invalid || 0;
    stockImportSummary.duplicate = result.summary?.duplicate || 0;
    stockImportSummary.existed = result.summary?.existed || 0;
    stockImportSummary.overLimit = result.summary?.overLimit || 0;
    stockImportErrors.value = result.errors || [];
    stockImportTip.value = `本次尝试 ${result.attempted} 条，成功导入 ${result.inserted} 条，跳过 ${result.skipped} 条`;
    applyStockSummary(result.stock);
    updateProductStock(stockProduct.value.id, result.stock);
    ElMessage.success('导入成功');
    loadStock();
  } catch (err: any) {
    ElMessage.error(err?.message || '导入失败');
  } finally {
    stockImporting.value = false;
  }
}

async function removeStock(row: ProductStockItem) {
  if (!stockProduct.value) return;
  if (row.status !== 'available') return;
  try {
    await ElMessageBox.confirm('确认删除该卡密？', '提示', { type: 'warning' });
    await deleteProductStock(stockProduct.value.id, row.id);
    ElMessage.success('删除成功');
    await loadStock();
    await refreshStockSummary(stockProduct.value.id);
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.message || '删除失败');
  }
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

async function openEdit(id: number) {
  editingId.value = id;
  dialogVisible.value = true;
  saving.value = true;
  try {
    const data = await getProduct(id);
    form.name = data.name;
    form.category = data.category;
    form.status = data.status;
    form.price = data.price;
    form.originalPrice = data.originalPrice || '';
    form.promoPrice = data.promoPrice || '';
    form.promoStartAt = data.promoStartAt || '';
    form.promoEndAt = data.promoEndAt || '';
    form.followers = data.followers;
    form.likes = data.likes;
    form.isRealName = data.isRealName;
    form.mainImage = data.mainImage || '';
    form.screenshot = data.screenshot || '';
    form.description = data.description || '';
    form.cardNumber = '';
  } catch (err: any) {
    ElMessage.error(err?.message || '加载失败');
  } finally {
    saving.value = false;
  }
}

async function save() {
  if (!form.name || !form.category || !form.price) {
    ElMessage.error('名称/分类/售价必填');
    return;
  }

  const priceValue = Number(form.price);
  if (Number.isNaN(priceValue) || priceValue <= 0) {
    ElMessage.error('售价需为正数');
    return;
  }

  const promoValue = form.promoPrice ? Number(form.promoPrice) : null;
  if (form.promoPrice && (Number.isNaN(promoValue) || promoValue <= 0)) {
    ElMessage.error('活动价需为正数');
    return;
  }
  if (promoValue !== null && promoValue >= priceValue) {
    ElMessage.error('活动价需小于售价');
    return;
  }
  if ((form.promoStartAt || form.promoEndAt) && !form.promoPrice) {
    ElMessage.error('请先填写活动价');
    return;
  }
  if (form.promoStartAt && form.promoEndAt) {
    const startTime = Date.parse(form.promoStartAt);
    const endTime = Date.parse(form.promoEndAt);
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      ElMessage.error('活动时间格式有误');
      return;
    }
    if (startTime > endTime) {
      ElMessage.error('活动开始时间需早于结束时间');
      return;
    }
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name,
      category: form.category,
      status: form.status,
      price: form.price,
      originalPrice: form.originalPrice || null,
      promoPrice: form.promoPrice || null,
      promoStartAt: form.promoStartAt || null,
      promoEndAt: form.promoEndAt || null,
      followers: form.followers,
      likes: form.likes,
      isRealName: form.isRealName,
      mainImage: form.mainImage || null,
      screenshot: form.screenshot || null,
      description: form.description || null,
      ...(editingId.value ? {} : { cardNumber: form.cardNumber || null }),
    };
    if (editingId.value) await updateProduct(editingId.value, payload);
    else await createProduct(payload);

    ElMessage.success('保存成功');
    dialogVisible.value = false;
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: Product) {
  const next = row.status === 'online' ? 'offline' : 'online';
  try {
    await patchProductStatus(row.id, next);
    ElMessage.success('更新成功');
    load();
  } catch (err: any) {
    ElMessage.error(err?.message || '更新失败');
  }
}

async function remove(id: number) {
  try {
    await ElMessageBox.confirm('确认删除该卡密？', '提示', { type: 'warning' });
    await deleteProduct(id);
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.span2 {
  grid-column: 1 / -1;
}

.form-tip {
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  color: rgba(15, 23, 42, 0.65);
}

.stock-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.stock-pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.7);
}

.stock-pill.available {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.stock-pill.reserved {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.stock-pill.sold {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.stock-total {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.stock-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.stock-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.7);
}

.stock-badge.available {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.stock-badge.reserved {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.stock-badge.sold {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
}

.stock-badge.total {
  background: rgba(15, 23, 42, 0.08);
  color: rgba(15, 23, 42, 0.75);
}

.stock-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stock-import {
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(15, 23, 42, 0.16);
  background: rgba(15, 23, 42, 0.02);
  margin-bottom: 14px;
}

.stock-import-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(15, 23, 42, 0.8);
}

.stock-import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.promo-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stock-import-summary {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stock-chip {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.7);
}

.stock-chip.success {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.stock-chip.warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.stock-import-errors {
  margin-top: 12px;
}

.stock-import-errors-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(15, 23, 42, 0.8);
}

.stock-tip {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.6);
}
</style>
