<template>
  <div class="app-card p16">
    <div class="toolbar">
      <div class="filters">
        <el-date-picker
          v-model="range"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />
        <el-button type="primary" @click="load">查询</el-button>
      </div>
    </div>

    <div class="grid">
      <div class="metric app-card">
        <div class="label">交易总数</div>
        <div class="value">{{ data?.totalOrders ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">已支付交易</div>
        <div class="value">{{ data?.paidOrders ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">退款笔数</div>
        <div class="value">{{ data?.refundedOrders ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">成交转化率</div>
        <div class="value">{{ data?.conversionRate ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">退款率</div>
        <div class="value">{{ data?.refundRate ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">交易总额</div>
        <div class="value">￥{{ data?.totalSalesAmount ?? '-' }}</div>
      </div>
      <div class="metric app-card">
        <div class="label">退款总额</div>
        <div class="value">￥{{ data?.totalRefundAmount ?? '-' }}</div>
      </div>
    </div>

    <div class="rule-card app-card">
      <div class="rule-title">满减规则</div>
      <div class="rule-grid">
        <div class="rule-item">
          <div class="label">启用状态</div>
          <el-switch v-model="ruleForm.enabled" active-text="启用" inactive-text="停用" />
        </div>
        <div class="rule-item">
          <div class="label">满减门槛（元）</div>
          <el-input-number v-model="ruleForm.threshold" :min="0" :precision="2" style="width: 100%" />
        </div>
        <div class="rule-item">
          <div class="label">立减金额（元）</div>
          <el-input-number v-model="ruleForm.reduce" :min="0" :precision="2" style="width: 100%" />
        </div>
        <div class="rule-actions">
          <el-button type="primary" :loading="ruleSaving" @click="saveRule">保存规则</el-button>
          <span class="rule-tip">按当前售价（促销价优先）计算满减。</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import {
  getFullReductionRule,
  getSalesStatistics,
  updateFullReductionRule,
  type SalesStatistics,
} from '../api/business';

const range = ref<[string, string] | null>(null);
const data = ref<SalesStatistics | null>(null);
const ruleSaving = ref(false);
const ruleForm = reactive({
  enabled: false,
  threshold: 0,
  reduce: 0,
});

async function load() {
  try {
    const params: { startDate?: string; endDate?: string } = {};
    if (range.value) {
      params.startDate = range.value[0];
      params.endDate = range.value[1];
    }
    data.value = await getSalesStatistics(params);
  } catch (err: any) {
    ElMessage.error(err?.message || '加载失败');
  }
}

async function loadRule() {
  try {
    const rule = await getFullReductionRule();
    ruleForm.enabled = !!rule.enabled;
    ruleForm.threshold = Number(rule.threshold) || 0;
    ruleForm.reduce = Number(rule.reduce) || 0;
  } catch (err: any) {
    ElMessage.error(err?.message || '规则加载失败');
  }
}

async function saveRule() {
  if (ruleForm.enabled) {
    if (ruleForm.threshold <= 0 || ruleForm.reduce <= 0) {
      ElMessage.error('满减门槛/立减金额需大于 0');
      return;
    }
    if (ruleForm.reduce >= ruleForm.threshold) {
      ElMessage.error('立减金额需小于满减门槛');
      return;
    }
  }

  ruleSaving.value = true;
  try {
    const rule = await updateFullReductionRule({
      enabled: ruleForm.enabled,
      threshold: Number(ruleForm.threshold),
      reduce: Number(ruleForm.reduce),
    });
    ruleForm.enabled = !!rule.enabled;
    ruleForm.threshold = Number(rule.threshold) || 0;
    ruleForm.reduce = Number(rule.reduce) || 0;
    ElMessage.success('规则已更新');
  } catch (err: any) {
    ElMessage.error(err?.message || '规则保存失败');
  } finally {
    ruleSaving.value = false;
  }
}

onMounted(() => {
  load();
  loadRule();
});
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

.rule-card {
  margin-top: 16px;
  padding: 16px;
}

.rule-title {
  font-weight: 700;
  margin-bottom: 12px;
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.rule-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.rule-tip {
  font-size: 12px;
  color: var(--app-muted);
}

@media (max-width: 1200px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
