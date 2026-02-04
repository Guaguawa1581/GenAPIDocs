<script setup lang="ts">
import { useDraftStore } from '../../stores/draft';
import { parseResponseJson } from '../../utils/parseJson';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';

const draftStore = useDraftStore();

const handleResponseChange = () => {
  if (draftStore.config.responseJsonRaw) {
    draftStore.config.responseFields = parseResponseJson(draftStore.config.responseJsonRaw);
    // Update the default response rawJson as well
    const index = draftStore.config.responses.findIndex(r => r.statusCode === 200);
    if (index !== -1) {
      draftStore.config.responses[index].rawJson = draftStore.config.responseJsonRaw;
    }
  }
};
</script>

<template>
  <div class="step-container full-width">
    <h2>Step 4: Response 區</h2>

    <div class="split-layout">
      <!-- Left: JSON Input -->
      <div class="json-side">
        <label class="block mb-2 font-bold">Response JSON 範例 (200 OK)</label>
        <div class="mb-2 text-sm text-gray-600">
           貼入 JSON 後（需含 records 陣列），系統會自動解析右側欄位。
        </div>
        <Textarea 
          v-model="draftStore.config.responseJsonRaw" 
          rows="20" 
          class="w-full font-mono" 
          placeholder='{ "records": [{ "id": 1, "title": "hello" }] }'
          @blur="handleResponseChange"
        />
        <Message v-if="draftStore.config.responseJsonRaw && !draftStore.config.responseJsonRaw.includes('records')" severity="warn" class="mt-2">
          請確保包含 "records" 陣列以正確解析欄位。
        </Message>
      </div>

      <!-- Right: Field Mapping -->
      <div class="fields-side">
        <label class="block mb-2 font-bold">欄位說明 (自動產生)</label>
        <DataTable :value="draftStore.config.responseFields" size="small" scrollable scrollHeight="500px" class="text-left border rounded">
          <Column field="name" header="欄位名稱" style="width: 30%"></Column>
          <Column field="type" header="型態" style="width: 20%"></Column>
          <Column header="意思 (Description)" style="width: 50%">
            <template #body="{ data }">
              <InputText v-model="data.description" class="w-full" placeholder="輸入說明" />
            </template>
          </Column>
        </DataTable>
        
        <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
           <h4 class="font-bold text-blue-800">404 Response 提示</h4>
           <p class="text-sm text-blue-700">狀態404為固定版型，系統會自動輸出「查無的錯誤，讀取message」。</p>
        </div>
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

.json-side, .fields-side {
  display: flex;
  flex-direction: column;
}

.border { border: 1px solid #e2e8f0; }
.rounded { border-radius: 8px; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.p-3 { padding: 0.75rem; }
.bg-blue-50 { background-color: #eff6ff; }
.text-blue-800 { color: #1e40af; }
.text-blue-700 { color: #1d4ed8; }
.text-gray-600 { color: #4b5563; }
</style>

<style scoped>
.w-full {
  width: 100%;
}
</style>
