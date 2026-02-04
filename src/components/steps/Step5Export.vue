<script setup lang="ts">
import { useDraftStore } from '../../stores/draft';
import { exportToExcel } from '../../utils/exportExcel';
import Button from 'primevue/button';
import Card from 'primevue/card';

const draftStore = useDraftStore();

const handleExport = () => {
  exportToExcel(draftStore.config);
};

const resetDraft = () => {
  if (confirm('確定要清除所有目前草稿嗎？')) {
    draftStore.clearDraft();
  }
};
</script>

<template>
  <div class="step-container">
    <h2>Step 5: 預覽與匯出 Excel</h2>

    <Card class="preview-card mt-4">
      <template #title>API 摘要</template>
      <template #content>
        <div class="summary">
          <p><strong>標題：</strong> {{ draftStore.config.apiMeta.title || '(未填寫)' }}</p>
          <p><strong>網址：</strong> {{ draftStore.config.apiMeta.url || '(未填寫)' }}</p>
          <p><strong>方法：</strong> {{ draftStore.config.apiMeta.method }}</p>
          <p><strong>Route 參數：</strong> {{ draftStore.config.routeParams.length }} 個</p>
          <p><strong>Query 參數：</strong> {{ draftStore.config.queryParams.length }} 個</p>
          <p><strong>Response 欄位：</strong> {{ draftStore.config.responseFields.length }} 個</p>
        </div>
      </template>
    </Card>

    <div class="action-buttons mt-6">
      <Button 
        label="匯出 Excel (.xlsx)" 
        icon="pi pi-file-excel" 
        severity="success" 
        size="large"
        @click="handleExport"
      />
      <Button 
        label="清除草稿" 
        icon="pi pi-trash" 
        severity="danger" 
        text
        @click="resetDraft"
      />
    </div>
  </div>
</template>

<style scoped>
.preview-card {
  max-width: 600px;
  margin: 0 auto;
  text-align: left;
}

.summary p {
  margin: 0.5rem 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
</style>
