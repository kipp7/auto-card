<template>
  <div class="app-card p16">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="filters.orderNo" placeholder="交易号" clearable style="max-width: 240px" />
        <el-input v-model="filters.buyerPhone" placeholder="手机号" clearable style="max-width: 200px" />
        <el-input v-model="filters.productName" placeholder="卡密名称" clearable style="max-width: 220px" />
        <el-select v-model="filters.status" placeholder="状态" clearable style="max-width: 160px">
          <el-option label="pending" value="pending" />
          <el-option label="completed" value="completed" />
          <el-option label="cancelled" value="cancelled" />
        </el-select>
        <el-select v-model="filters.payStatus" placeholder="支付状态" clearable style="max-width: 160px">
          <el-option label="已支付" value="paid" />
          <el-option label="未支付" value="unpaid" />
        </el-select>
        <el-select v-model="filters.refundStatus" placeholder="退款状态" clearable style="max-width: 160px">
          <el-option label="未退款" value="none" />
          <el-option label="已退款" value="refunded" />
          <el-option label="退款中" value="pending" />
          <el-option label="退款失败" value="failed" />
        </el-select>
        <el-select v-model="filters.paymentMethod" placeholder="支付方式" clearable style="max-width: 160px">
          <el-option label="wechat" value="wechat" />
          <el-option label="alipay" value="alipay" />
          <el-option label="qq" value="qq" />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="max-width: 260px"
        />
        <el-button type="primary" @click="load">查询</el-button>
      </div>
      <div class="actions">
        <el-button type="primary" plain :disabled="!selection.length" :loading="batchDelivering" @click="batchDeliver">
          批量发放
        </el-button>
        <el-button type="warning" plain :loading="reconcileLoading" @click="openReconcile">对账检查</el-button>
        <el-button type="info" plain :loading="exporting" @click="exportCsv">导出CSV</el-button>
      </div>
    </div>

    <el-table
      ref="tableRef"
      :data="list"
      v-loading="loading"
      stripe
      style="width: 100%"
      row-key="orderId"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="orderId" label="ID" width="70" />
      <el-table-column prop="orderNo" label="交易号" width="220" show-overflow-tooltip />
      <el-table-column prop="productName" label="卡密" min-width="200" show-overflow-tooltip />
      <el-table-column label="实付金额" width="120">
        <template #default="{ row }">{{ formatMoney(row.orderAmount) }}</template>
      </el-table-column>
      <el-table-column label="原价" width="120">
        <template #default="{ row }">{{ formatMoney(row.originalAmount) }}</template>
      </el-table-column>
      <el-table-column label="优惠" width="120">
        <template #default="{ row }">{{ formatMoney(row.discountAmount) }}</template>
      </el-table-column>
      <el-table-column prop="buyerPhone" label="手机号" width="140" />
      <el-table-column prop="paymentMethod" label="支付方式" width="110" />
      <el-table-column prop="payStatus" label="支付" width="110" />
      <el-table-column label="退款" width="110">
        <template #default="{ row }">
          <el-tag
            :type="row.refundStatus === 'refunded' ? 'info' : row.refundStatus === 'pending' ? 'warning' : 'success'"
          >
            {{ row.refundStatus === 'refunded' ? '已退款' : row.refundStatus === 'pending' ? '退款中' : '未退款' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="110" />
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.orderId)">详情</el-button>
          <el-button size="small" type="primary" plain @click="deliver(row.orderId)">发放</el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="row.payStatus !== 'paid' || row.refundStatus === 'refunded'"
            @click="refund(row)"
          >
            退款
          </el-button>
          <el-button size="small" type="warning" plain @click="cancel(row.orderId)">取消</el-button>
          <el-button size="small" type="danger" plain @click="remove(row.orderId)">删除</el-button>
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

  <el-dialog v-model="detailVisible" title="交易详情" width="720px">
    <el-descriptions :column="2">
      <el-descriptions-item label="交易号">{{ detail?.orderNo }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail?.status }}</el-descriptions-item>
      <el-descriptions-item label="卡密">{{ detail?.productName }}</el-descriptions-item>
      <el-descriptions-item label="实付金额">{{ formatMoney(detail?.orderAmount) }}</el-descriptions-item>
      <el-descriptions-item label="原价">{{ formatMoney(detail?.originalAmount) }}</el-descriptions-item>
      <el-descriptions-item label="优惠">{{ formatMoney(detail?.discountAmount) }}</el-descriptions-item>
      <el-descriptions-item label="手机号">{{ detail?.buyerPhone }}</el-descriptions-item>
      <el-descriptions-item label="支付方式">{{ detail?.paymentMethod }}</el-descriptions-item>
      <el-descriptions-item label="支付状态">{{ detail?.payStatus }}</el-descriptions-item>
      <el-descriptions-item label="支付流水">{{ detail?.paymentTradeNo || '-' }}</el-descriptions-item>
      <el-descriptions-item label="退款状态">{{ detail?.refundStatus || 'none' }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">{{ detail?.refundAmount || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ detail?.createdAt }}</el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ detail?.paidAt }}</el-descriptions-item>
      <el-descriptions-item label="发货时间">{{ detail?.deliveredAt }}</el-descriptions-item>
      <el-descriptions-item label="退款时间">{{ detail?.refundedAt || '-' }}</el-descriptions-item>
      <el-descriptions-item label="退款原因" :span="2">
        <span>{{ detail?.refundReason || '-' }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="卡密" :span="2">
        <el-input v-model="detailCardNumber" type="textarea" :rows="3" placeholder="留空则自动分配库存卡密" />
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="detailVisible = false">关闭</el-button>
      <el-button type="primary" :loading="saving" @click="deliver()">保存并发放</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="reconcileVisible" title="对账检查（已支付异常）" width="920px">
    <el-table :data="reconcileList" v-loading="reconcileLoading" stripe style="width: 100%">
      <el-table-column prop="orderId" label="交易ID" width="90" />
      <el-table-column prop="orderNo" label="交易号" min-width="200" show-overflow-tooltip />
      <el-table-column prop="productName" label="卡密" min-width="160" show-overflow-tooltip />
      <el-table-column prop="cardId" label="卡密ID" width="90" />
      <el-table-column prop="cardNumber" label="卡密" min-width="160" show-overflow-tooltip />
      <el-table-column prop="cardStatus" label="卡密状态" width="110" />
      <el-table-column prop="soldOrderId" label="售出交易" width="110" />
      <el-table-column prop="paidAt" label="支付时间" width="170" />
      <el-table-column prop="createdAt" label="下单时间" width="170" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            plain
            :loading="repairingId === row.orderId"
            :disabled="repairingId !== null && repairingId !== row.orderId"
            @click="repair(row.orderId)"
          >
            修复
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager">
      <el-pagination
        v-model:current-page="reconcilePage"
        v-model:page-size="reconcilePageSize"
        :total="reconcileTotal"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        @current-change="loadReconcile"
        @size-change="onReconcileSizeChange"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  batchDeliverOrders,
  deleteOrder,
  deliverOrder,
  exportOrders,
  getOrder,
  getOrderReconcile,
  listOrders,
  patchOrderStatus,
  repairOrder,
  refundOrder,
  type Order,
  type OrderDetail,
  type ReconcileItem,
} from '../api/business';

const loading = ref(false);
const saving = ref(false);
const list = ref<Order[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const exporting = ref(false);
const batchDelivering = ref(false);
const selection = ref<Order[]>([]);
const tableRef = ref();
const reconcileVisible = ref(false);
const reconcileLoading = ref(false);
const reconcileList = ref<ReconcileItem[]>([]);
const reconcileTotal = ref(0);
const reconcilePage = ref(1);
const reconcilePageSize = ref(20);
const repairingId = ref<number | null>(null);

const filters = reactive({
  orderNo: '',
  buyerPhone: '',
  productName: '',
  status: '' as string,
  payStatus: '' as string,
  refundStatus: '' as string,
  paymentMethod: '' as string,
  dateRange: [] as string[],
});

const detailVisible = ref(false);
const detail = ref<OrderDetail | null>(null);
const detailCardNumber = ref('');

async function load() {
  loading.value = true;
  try {
    const [startDate, endDate] = filters.dateRange || [];
    const data = await listOrders({
      page: page.value,
      pageSize: pageSize.value,
      orderNo: filters.orderNo || undefined,
      buyerPhone: filters.buyerPhone || undefined,
      productName: filters.productName || undefined,
      status: filters.status || undefined,
      payStatus: filters.payStatus || undefined,
      refundStatus: filters.refundStatus || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    list.value = data.list;
    total.value = data.total;
    selection.value = [];
    tableRef.value?.clearSelection?.();
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

function getQueryParams() {
  const [startDate, endDate] = filters.dateRange || [];
  return {
    orderNo: filters.orderNo || undefined,
    buyerPhone: filters.buyerPhone || undefined,
    productName: filters.productName || undefined,
    status: filters.status || undefined,
    payStatus: filters.payStatus || undefined,
    refundStatus: filters.refundStatus || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
}

function onSelectionChange(rows: Order[]) {
  selection.value = rows || [];
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

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return `￥${value}`;
}

async function exportCsv() {
  exporting.value = true;
  try {
    const blob = await exportOrders(getQueryParams());
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${formatTimestamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (err: any) {
    ElMessage.error(err?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

async function batchDeliver() {
  if (!selection.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认批量发放选中的 ${selection.value.length} 单？将自动分配库存卡密。`,
      '批量发放',
      { type: 'warning' },
    );
  } catch (err) {
    if (err === 'cancel') return;
    throw err;
  }

  batchDelivering.value = true;
  try {
    const result = await batchDeliverOrders({
      orderIds: selection.value.map((item) => item.orderId),
    });
    const failed = (result.results || []).filter((item) => !item.ok);
    if (failed.length) {
      const detail = failed
        .slice(0, 10)
        .map((item) => `#${item.orderId}: ${item.message}`)
        .join('\n');
      ElMessageBox.alert(
        `成功 ${result.success} 单，失败 ${result.failed} 单。\n\n${detail}`,
        '批量发放完成',
        { type: 'warning' },
      );
    } else {
      ElMessage.success(`批量发放完成，成功 ${result.success} 单`);
    }
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || '批量发放失败');
  } finally {
    batchDelivering.value = false;
  }
}

async function loadReconcile() {
  reconcileLoading.value = true;
  try {
    const data = await getOrderReconcile({ page: reconcilePage.value, pageSize: reconcilePageSize.value });
    reconcileList.value = data.list;
    reconcileTotal.value = data.total;
  } catch (err: any) {
    ElMessage.error(err?.message || '对账加载失败');
  } finally {
    reconcileLoading.value = false;
  }
}

function onReconcileSizeChange(size: number) {
  reconcilePageSize.value = size;
  reconcilePage.value = 1;
  loadReconcile();
}

function openReconcile() {
  reconcileVisible.value = true;
  reconcilePage.value = 1;
  loadReconcile();
}

async function repair(orderId: number) {
  try {
    await ElMessageBox.confirm(
      '确认修复该交易？系统会尝试重新绑定库存卡密并更新发货状态。',
      '修复交易',
      { type: 'warning' },
    );
  } catch (err) {
    if (err === 'cancel') return;
    throw err;
  }

  repairingId.value = orderId;
  try {
    await repairOrder(orderId);
    ElMessage.success('修复完成');
    await loadReconcile();
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || '修复失败');
  } finally {
    repairingId.value = null;
  }
}

async function openDetail(orderId: number) {
  detailVisible.value = true;
  saving.value = true;
  try {
    const data = await getOrder(orderId);
    detail.value = data;
    detailCardNumber.value = data.cardNumber || '';
  } catch (err: any) {
    ElMessage.error(err?.message || '加载失败');
    detailVisible.value = false;
  } finally {
    saving.value = false;
  }
}

async function deliver(orderId?: number) {
  const id = orderId ?? detail.value?.orderId;
  if (!id) return;

  let cardNumber = detailCardNumber.value;
  if (orderId) {
    try {
      const { value } = await ElMessageBox.prompt('请输入卡密（留空则自动分配库存）', '发放卡密', {
        inputType: 'textarea',
        inputValue: '',
        inputPlaceholder: '留空则自动分配库存卡密',
        confirmButtonText: '发放',
        cancelButtonText: '取消',
      });
      cardNumber = value;
    } catch (err) {
      if (err === 'cancel') return;
      throw err;
    }
  }

  if (cardNumber) {
    cardNumber = cardNumber.trim();
  }

  saving.value = true;
  try {
    await deliverOrder(id, cardNumber);
    ElMessage.success('发放成功');
    detailVisible.value = false;
    load();
  } catch (err: any) {
    ElMessage.error(err?.message || '发放失败');
  } finally {
    saving.value = false;
  }
}

async function refund(row: Order) {
  if (row.payStatus !== 'paid' || row.refundStatus === 'refunded') return;

  let amountValue = row.orderAmount;
  try {
    const { value } = await ElMessageBox.prompt('退款金额（可修改）', '退款金额', {
      inputValue: String(amountValue || ''),
      inputPattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
      inputErrorMessage: '请输入合法金额',
      confirmButtonText: '下一步',
      cancelButtonText: '取消',
    });
    amountValue = value;
  } catch (err) {
    if (err === 'cancel') return;
    throw err;
  }

  let reason = '';
  try {
    const { value } = await ElMessageBox.prompt('退款原因（可选）', '退款原因', {
      inputType: 'textarea',
      inputValue: '',
      confirmButtonText: '确认退款',
      cancelButtonText: '取消',
    });
    reason = value;
  } catch (err) {
    if (err === 'cancel') return;
    throw err;
  }

  saving.value = true;
  try {
    await refundOrder(row.orderId, {
      amount: Number(amountValue),
      reason: reason || undefined,
    });
    ElMessage.success('退款成功');
    load();
  } catch (err: any) {
    ElMessage.error(err?.message || '退款失败');
  } finally {
    saving.value = false;
  }
}

async function cancel(orderId: number) {
  try {
    await ElMessageBox.confirm('确认取消该交易？', '提示', { type: 'warning' });
    await patchOrderStatus(orderId, 'cancelled');
    ElMessage.success('已取消');
    load();
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.message || '操作失败');
  }
}

async function remove(orderId: number) {
  try {
    await ElMessageBox.confirm('确认删除该交易？', '提示', { type: 'warning' });
    await deleteOrder(orderId);
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
  flex-wrap: wrap;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.actions {
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
