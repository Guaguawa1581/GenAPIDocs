<script setup lang="ts">
import { useDraftStore } from '../../stores/draft';
import { parseRequestJson } from '../../utils/parseJson';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

const draftStore = useDraftStore();

const handleRequestChange = () => {
  if (draftStore.config.requestJsonRaw) {
    draftStore.config.requestFields = parseRequestJson(draftStore.config.requestJsonRaw);
  }
};
</script>

<template>
  <div class="step-container full-width">
    <h2>Step 3: JSON BODY (Request)</h2>
    
    <div class="split-layout">
      <!-- Left: Request JSON Input -->
      <div class="json-side">
        <label class="block mb-2 font-bold">Request JSON 範例</label>
        <Textarea 
          v-model="draftStore.config.requestJsonRaw" 
          rows="22" 
          class="w-full font-mono" 
          placeholder='{ "id": 1, "data": { "name": "test" } }'
          @blur="handleRequestChange"
        />
      </div>

      <!-- Right: Request Fields mapping -->
      <div class="fields-side">
        <label class="block mb-2 font-bold">Request 欄位說明 (自動產生層級)</label>
        <DataTable :value="draftStore.config.requestFields" size="small" scrollable scrollHeight="500px" class="text-left border rounded">
          <Column header="欄位名稱" style="width: 40%">
            <template #body="{ data }">
              <span class="font-mono">{{ '~'.repeat(data.level || 0) }}{{ data.name }}</span>
            </template>
          </Column>
          <Column field="type" header="型態" style="width: 20%"></Column>
          <Column header="意思 (Description)" style="width: 40%">
            <template #body="{ data }">
              <InputText v-model="data.description" class="w-full" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.full-width {
  max-width: 1400px;
  width: 100%;
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.border { border: 1px solid #e2e8f0; }
.rounded { border-radius: 8px; }
.mb-2 { margin-bottom: 0.5rem; }
.w-full { width: 100%; }
</style>

<style scoped>
.json-content {
  max-width: 900px;
  margin: 0 auto;
}

.json-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

.font-mono {
  font-family: monospace;
}

.w-full {
  width: 100%;
}
</style>
