<script setup lang="ts">
import { computed } from 'vue';
import { useDraftStore } from '../../stores/draft';
import { exportToExcel } from '../../utils/exportExcel';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';

const draftStore = useDraftStore();
const toast = useToast();

const handleExport = () => {
  exportToExcel(draftStore.config);
};

const configJson = computed(() => JSON.stringify(draftStore.config, null, 2));

const copyConfig = async () => {
  try {
    await navigator.clipboard.writeText(configJson.value);
    toast.add({ severity: 'success', summary: '複製成功', detail: '設定值已複製到剪貼簿', life: 3000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: '複製失敗', detail: '無法存取剪貼簿', life: 3000 });
  }
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

    <div class="split-layout mt-4">
      <Card class="preview-card text-left">
        <template #title>API 摘要</template>
        <template #content>
          <div class="summary">
            <p><strong>標題：</strong> {{ draftStore.config.apiMeta.title || '(未填寫)' }}</p>
            <p><strong>網址：</strong> {{ draftStore.config.apiMeta.url || '(未填寫)' }}</p>
            <p><strong>方法：</strong> {{ draftStore.config.apiMeta.method }}</p>
            <p><strong>Route 參數：</strong> {{ draftStore.config.routeParams.length }} 個</p>
            <p><strong>Query 參數：</strong> {{ draftStore.config.queryParams.length }} 個</p>
            <hr />
            <p><strong>Request Body 欄位：</strong> {{ draftStore.config.requestFields.length }} 個</p>
            <p><strong>定義 Response 狀態：</strong> {{ draftStore.config.responses.length }} 個</p>
          </div>
        </template>
      </Card>

      <Card class="settings-card text-left">
        <template #title>
          <div class="d-flex justify-content-between align-items-center">
            <span>目前設定值 (JSON)</span>
            <Button label="一鍵複製" icon="pi pi-copy" size="small" variant="text" @click="copyConfig" />
          </div>
        </template>
        <template #content>
          <Textarea 
            :value="configJson" 
            rows="10" 
            readonly 
            class="w-100 font-monospace small bg-light border" 
          />
        </template>
      </Card>
    </div>

    <div class="action-buttons mt-5">
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
        variant="text"
        @click="resetDraft"
      />
    </div>
  </div>
</template>

<style scoped>
.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.preview-card, .settings-card {
  height: 100%;
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
</style>
