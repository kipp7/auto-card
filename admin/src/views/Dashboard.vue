<template>
  <div class="grid">
    <div class="metric app-card">
      <div class="label">卡密总数</div>
      <div class="value">{{ data?.productTotal ?? '-' }}</div>
    </div>
    <div class="metric app-card">
      <div class="label">交易总数</div>
      <div class="value">{{ data?.orderTotal ?? '-' }}</div>
    </div>
    <div class="metric app-card">
      <div class="label">已支付交易</div>
      <div class="value">{{ data?.paidOrderTotal ?? '-' }}</div>
    </div>
    <div class="metric app-card">
      <div class="label">转化率</div>
      <div class="value">{{ data?.conversionRate ?? '0.00' }}%</div>
    </div>
    <div class="metric app-card">
      <div class="label">退款率</div>
      <div class="value">{{ data?.refundRate ?? '0.00' }}%</div>
    </div>
    <div class="metric app-card">
      <div class="label">今日交易</div>
      <div class="value">{{ data?.todayOrderTotal ?? '-' }}</div>
    </div>
    <div class="metric app-card">
      <div class="label">今日交易额</div>
      <div class="value">￥{{ data?.todaySalesAmount ?? '-' }}</div>
    </div>
    <div class="metric app-card">
      <div class="label">累计交易额</div>
      <div class="value">￥{{ data?.totalSalesAmount ?? '-' }}</div>
    </div>
    <div class="metric app-card warn">
      <div class="label">异常对账</div>
      <div class="value">{{ data?.reconcileCount ?? 0 }}</div>
      <div class="meta">最近检测：{{ data?.reconcileCheckedAt || '-' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { getDashboardOverview, type DashboardOverview } from '../api/business';

const data = ref<DashboardOverview | null>(null);

onMounted(async () => {
  try {
    data.value = await getDashboardOverview();
  } catch (err: any) {
    ElMessage.error(err?.message || '加载失败');
  }
});
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  padding: 14px;
}

.label {
  color: var(--app-muted);
  font-size: 12px;
}

.value {
  font-size: 22px;
  font-weight: 800;
  margin-top: 6px;
}

.meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--app-muted);
}

.metric.warn {
  border: 1px solid rgba(249, 115, 22, 0.3);
  background: rgba(249, 115, 22, 0.08);
}

@media (max-width: 1200px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
