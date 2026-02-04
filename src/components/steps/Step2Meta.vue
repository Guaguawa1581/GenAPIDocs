<script setup lang="ts">
import { useDraftStore } from '../../stores/draft';
import { parseUrl, generateUrlExample } from '../../utils/parseUrl';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';

const draftStore = useDraftStore();
const methods = ['GET', 'POST', 'PUT', 'DELETE'];

const handleUrlChange = () => {
  const { pathParams, queryParams } = parseUrl(draftStore.config.apiMeta.url);
  draftStore.config.routeParams = pathParams;
  draftStore.config.queryParams = queryParams;
};
</script>

<template>
  <div class="step-container">
    <h2>Step 2: 填寫 API 基本資訊</h2>
    <div class="form-grid">
      <div class="field">
        <label for="title">功能名稱</label>
        <InputText id="title" v-model="draftStore.config.apiMeta.title" placeholder="例如：取得客戶清冊" class="w-full" />
      </div>

      <div class="field">
        <label for="method">Method</label>
        <Dropdown id="method" v-model="draftStore.config.apiMeta.method" :options="methods" class="w-full" />
      </div>

      <div class="field col-span-2">
        <label for="url">URL (支援 {param} 與 ?query)</label>
        <InputText 
          id="url" 
          v-model="draftStore.config.apiMeta.url" 
          placeholder="api/Client/{id}?t=1" 
          class="w-full"
          @blur="handleUrlChange"
        />
        <small>輸入後會自動解析 Route 跟 Query 參數</small>
      </div>

      <!-- Route Params (FromRoute) -->
      <div v-if="draftStore.config.routeParams.length > 0" class="field col-span-2">
        <label>Route 參數 (FromRoute)</label>
        <div class="params-table">
          <div class="params-header">
            <span>參數名稱</span>
            <span>意思 (Description)</span>
            <span>範例值 (Example)</span>
          </div>
          <div v-for="p in draftStore.config.routeParams" :key="p.name" class="params-body">
            <span class="param-name">{{ p.name }}:</span>
            <InputText v-model="p.description" placeholder="輸入說明" />
            <InputText v-model="p.example" placeholder="範例值" />
          </div>
        </div>
      </div>

      <!-- Query Params (FromQuery) -->
      <div v-if="draftStore.config.queryParams.length > 0" class="field col-span-2">
        <label>Query 參數 (FromQuery)</label>
        <div class="params-table">
          <div class="params-header">
            <span>參數名稱</span>
            <span>意思 (可含枚舉)</span>
            <span>範例值 (Example)</span>
          </div>
          <div v-for="p in draftStore.config.queryParams" :key="p.name" class="params-body">
            <span class="param-name">{{ p.name }}:</span>
            <InputText v-model="p.description" placeholder="例如：1: 啟用..." />
            <InputText v-model="p.example" placeholder="範例值" />
          </div>
        </div>
      </div>

      <!-- Generated URL Preview -->
      <div class="field col-span-2 url-preview">
        <label>URL 範例產生</label>
        <div class="preview-box">
          {{ generateUrlExample(draftStore.config.apiMeta.url, draftStore.config.routeParams, draftStore.config.queryParams) }}
        </div>
      </div>

      <div class="field col-span-2">
        <label for="desc">說明</label>
        <Textarea id="desc" v-model="draftStore.config.apiMeta.description" rows="3" class="w-full" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 800px;
  margin: 2rem auto;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.col-span-2 {
  grid-column: span 2;
}

.w-full {
  width: 100%;
}

.params-table {
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.params-header {
  display: grid;
  grid-template-columns: 150px 1fr 150px;
  gap: 1rem;
  font-weight: bold;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #cbd5e1;
}

.params-body {
  display: grid;
  grid-template-columns: 150px 1fr 150px;
  gap: 1rem;
  align-items: center;
}

.param-name {
  font-weight: bold;
  font-family: monospace;
}

.preview-box {
  background: #0f172a;
  color: #38bdf8;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  word-break: break-all;
}
</style>
