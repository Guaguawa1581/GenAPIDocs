<script setup lang="ts">
import { useDraftStore } from '../../stores/draft';
import { TemplateType } from '../../types';
import Card from 'primevue/card';

const draftStore = useDraftStore();
const templates: { id: TemplateType; label: string; icon: string; method: string }[] = [
  { id: 'list', label: '清冊 (List API)', icon: 'pi-list', method: 'GET' },
  { id: 'get', label: 'GET (單筆/詳情)', icon: 'pi-search', method: 'GET' },
  { id: 'post', label: 'POST (新增)', icon: 'pi-plus', method: 'POST' },
  { id: 'put', label: 'PUT (修改)', icon: 'pi-pencil', method: 'PUT' },
  { id: 'delete', label: 'DELETE (刪除)', icon: 'pi-trash', method: 'DELETE' },
];

const selectTemplate = (t: typeof templates[0]) => {
  draftStore.config.templateType = t.id;
  draftStore.config.apiMeta.method = t.method as any;
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
        :class="{ 'selected': draftStore.config.templateType === t.id }"
        @click="selectTemplate(t)"
      >
        <template #content>
          <i :class="['pi', t.icon]" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <div class="label">{{ t.label }}</div>
          <div class="method-tag" :class="t.method.toLowerCase()">{{ t.method }}</div>
        </template>
      </Card>
    </div>
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

.label {
  font-weight: bold;
  margin-bottom: 0.5rem;
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
