<script setup lang="ts">
import { ref } from 'vue';
import { useDraftStore } from '../../stores/draft';
import { TemplateType } from '../../types';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';

const emit = defineEmits(['next']);
const draftStore = useDraftStore();
const toast = useToast();

const templates: { id: string; label: string; icon: string; method?: string; isImport?: boolean }[] = [
  { id: 'list', label: '清冊 (List API)', icon: 'pi-list', method: 'GET' },
  { id: 'get', label: 'GET (單筆/詳情)', icon: 'pi-search', method: 'GET' },
  { id: 'post', label: 'POST (新增)', icon: 'pi-plus', method: 'POST' },
  { id: 'put', label: 'PUT (修改)', icon: 'pi-pencil', method: 'PUT' },
  { id: 'delete', label: 'DELETE (刪除)', icon: 'pi-trash', method: 'DELETE' },
  { id: 'import', label: '匯入舊設定', icon: 'pi-download', isImport: true },
];

const showImportDialog = ref(false);
const importJson = ref('');

const selectTemplate = (t: typeof templates[0]) => {
  if (t.isImport) {
    showImportDialog.value = true;
    return;
  }
  draftStore.config.templateType = t.id as TemplateType;
  draftStore.config.apiMeta.method = t.method as any;
  emit('next');
};

const handleImport = () => {
  if (!importJson.value) return;
  try {
    const data = JSON.parse(importJson.value);
    if (data.apiMeta) {
      draftStore.config = data;
      toast.add({ severity: 'success', summary: '匯入成功', detail: '已從 JSON 載入設定', life: 3000 });
      showImportDialog.value = false;
      emit('next');
    } else {
      throw new Error('不正確的模板格式（遺失 apiMeta）');
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: '匯入失敗', detail: (e as Error).message, life: 3000 });
  }
};
</script>

<template>
  <div class="step-container">
    <h2>Step 1: 選擇模板</h2>
    <div class="template-grid">
      <Card 
        v-for="t in templates" 
        :key="t.id"
        class="template-card"
        :class="{ 
          'selected': draftStore.config.templateType === t.id,
          'import-card': t.isImport
        }"
        @click="selectTemplate(t)"
      >
        <template #content>
          <div class="d-flex flex-column align-items-center">
            <i :class="['pi', t.icon]" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <div class="label">{{ t.label }}</div>
            <div v-if="t.method" class="method-tag" :class="t.method.toLowerCase()">{{ t.method }}</div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Import Dialog -->
    <Dialog v-model:visible="showImportDialog" modal header="匯入現有設定 (JSON)" :style="{ width: '50vw' }">
      <div class="p-fluid">
        <p class="small text-secondary mb-3">貼入先前從 Step 5 複製的 JSON 設定值。</p>
        <Textarea 
          v-model="importJson" 
          rows="12" 
          class="w-100 font-monospace mb-3" 
          placeholder='{ "apiMeta": { ... }, "routeParams": [ ... ], ... }'
          autoResize
        />
        <div class="d-flex justify-content-end gap-2">
          <Button label="取消" icon="pi pi-times" variant="text" @click="showImportDialog = false" />
          <Button label="匯入並進入下一步" icon="pi pi-check" @click="handleImport" :disabled="!importJson" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.template-card {
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  border: 4px solid transparent;
}

.template-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary-color-light, #3b82f6);
}

.template-card.selected {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.template-card.import-card {
  border-style: dashed;
  border-color: #94a3b8;
  background-color: #f8fafc;
}

.template-card.import-card:hover {
  border-color: #64748b;
  background-color: #f1f5f9;
}

.label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.method-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.get { background: #e0f2fe; color: #0369a1; }
.post { background: #dcfce7; color: #15803d; }
.put { background: #fef9c3; color: #a16207; }
.delete { background: #fee2e2; color: #b91c1c; }
</style>
