<script setup lang="ts">
import { computed } from "vue";
import { useDraftStore } from "../../stores/draft";
import { parseUrl, generateUrlExample } from "../../utils/parseUrl";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";
import Button from "primevue/button";

const draftStore = useDraftStore();
const methods = ["GET", "POST", "PUT", "DELETE"];

const PAGE_INFO_LINK = import.meta.env.VITE_PAGE_INFO_LINK || "";

const hasPageInfo = computed({
  get: () =>
    draftStore.config.queryParams.some((p) =>
      p.description.includes(PAGE_INFO_LINK),
    ),
  set: (val) => {
    if (val) {
      if (!hasPageInfo.value) {
        draftStore.config.queryParams.unshift({
          name: "",
          description: `=HYPERLINK("${PAGE_INFO_LINK}","pageInfo 參考")`,
          example: "",
          showInDesc: false, // pageinfo default hide from description table
          includeInUrl: false, // pageinfo default hide from URL
        });
      }
    } else {
      draftStore.config.queryParams = draftStore.config.queryParams.filter(
        (p) => !p.description.includes(PAGE_INFO_LINK),
      );
    }
  },
});

const currentUrlExample = computed(() =>
  generateUrlExample(
    draftStore.config.apiMeta.url,
    draftStore.config.routeParams,
    draftStore.config.queryParams,
  ),
);

const addUrlExample = () => {
  draftStore.config.urlExamples.push({
    id: crypto.randomUUID(),
    name: "範例 " + (draftStore.config.urlExamples.length + 1),
    url: currentUrlExample.value,
  });
};

const removeUrlExample = (index: number) => {
  draftStore.config.urlExamples.splice(index, 1);
};

const handleUrlChange = (isManual = false) => {
  // Only auto-parse if current params are empty or if manually requested
  const isEmpty =
    draftStore.config.routeParams.length === 0 &&
    draftStore.config.queryParams.length === 0;

  if (isManual || isEmpty) {
    const { pathParams, queryParams } = parseUrl(draftStore.config.apiMeta.url);
    const hadPageInfo = hasPageInfo.value;

    draftStore.config.routeParams = pathParams;
    draftStore.config.queryParams = queryParams;

    if (hadPageInfo) {
      hasPageInfo.value = true;
    }
  }
};
</script>

<template>
  <div class="step-container">
    <h2>Step 2: 填寫 API 基本資訊</h2>
    <div class="form-grid">
      <div class="field col-span-2">
        <label for="desc">API 功能 (將作為檔名/分頁名)</label>
        <InputText
          id="desc"
          v-model="draftStore.config.apiMeta.description"
          placeholder="例如：客戶管理_取得清冊"
          class="w-100"
        />
      </div>

      <div class="field">
        <label for="title">功能說明 (Excel 內容，可填函數)</label>
        <InputText
          id="title"
          v-model="draftStore.config.apiMeta.title"
          placeholder="例如：=HYPERLINK(...)"
          class="w-100"
        />
      </div>

      <div class="field">
        <label for="method">Method</label>
        <Select
          id="method"
          v-model="draftStore.config.apiMeta.method"
          :options="methods"
          class="w-100"
        />
      </div>

      <div class="field col-span-2">
        <div class="section-header">
          <label for="url">URL (支援 {param} 與 ?query)</label>
          <Button
            label="重新解析參數"
            icon="pi pi-refresh"
            size="small"
            variant="text"
            @click="handleUrlChange(true)"
          />
        </div>
        <InputText
          id="url"
          v-model="draftStore.config.apiMeta.url"
          placeholder="api/Client/{id}?t=1"
          class="w-100"
          @blur="handleUrlChange(false)"
        />
      </div>

      <!-- Route Params (FromRoute) -->
      <div
        v-if="draftStore.config.routeParams.length > 0"
        class="field col-span-2"
      >
        <label>Route 參數 (FromRoute)</label>
        <div class="params-table">
          <div class="params-header">
            <span>參數名稱</span>
            <span>意思</span>
            <span>範例值</span>
          </div>
          <div
            v-for="p in draftStore.config.routeParams"
            :key="p.name"
            class="params-body"
          >
            <span class="param-name">{{ p.name }}</span>
            <InputText v-model="p.description" placeholder="輸入說明" />
            <InputText v-model="p.example" placeholder="範例值" />
          </div>
        </div>
      </div>

      <!-- Query Params (FromQuery) -->
      <div class="field col-span-2">
        <div class="section-header">
          <label>Query 參數 (FromQuery)</label>
          <div class="checkbox-wrapper">
            <Checkbox
              v-model="hasPageInfo"
              :binary="true"
              inputId="pageinfo-check"
            />
            <label for="pageinfo-check" class="checkbox-label"
              >加入 pageInfo 參考</label
            >
          </div>
        </div>

        <div
          v-if="draftStore.config.queryParams.length > 0"
          class="params-table"
        >
          <div class="params-header query-header">
            <span>PATH</span>
            <span>參數名稱</span>
            <span>意思 (可含枚舉)</span>
            <span>範例值</span>
            <span class="text-center">說明</span>
          </div>
          <div
            v-for="(p, index) in draftStore.config.queryParams"
            :key="index"
            class="params-body query-body"
          >
            <Checkbox v-model="p.includeInUrl" :binary="true" />
            <span
              class="param-name"
              :class="{ 'text-strike': !p.showInDesc && !p.includeInUrl }"
              >{{ p.name || "-" }}</span
            >
            <InputText
              v-model="p.description"
              placeholder="例如：1: 啟用..."
              :disabled="!p.showInDesc"
            />
            <InputText
              v-model="p.example"
              placeholder="範例值"
              :disabled="!p.showInDesc"
            />
            <Button
              :icon="p.showInDesc ? 'pi pi-eye' : 'pi pi-eye-slash'"
              variant="text"
              :severity="p.showInDesc ? 'primary' : 'secondary'"
              size="small"
              @click="p.showInDesc = !p.showInDesc"
            />
          </div>
        </div>
      </div>

      <!-- Generated URL Preview & Examples -->
      <div class="field col-span-2 url-preview">
        <div class="section-header">
          <label>URL 範例產生</label>
          <Button
            label="儲存為範例"
            icon="pi pi-plus"
            size="small"
            variant="text"
            @click="addUrlExample"
          />
        </div>
        <div class="preview-box">
          {{ currentUrlExample }}
        </div>

        <!-- Saved Examples List -->
        <div
          v-if="draftStore.config.urlExamples.length > 0"
          class="examples-list mt-3"
        >
          <div
            v-for="(ex, index) in draftStore.config.urlExamples"
            :key="ex.id"
            class="example-item p-2 bg-light border rounded mb-2"
          >
            <div class="d-flex align-items-center gap-2 mb-2">
              <InputText
                v-model="ex.name"
                placeholder="範例名稱"
                class="p-1 small w-25"
              />
              <div class="flex-grow-1"></div>
              <Button
                icon="pi pi-trash"
                variant="text"
                severity="danger"
                size="small"
                @click="removeUrlExample(index)"
              />
            </div>
            <div class="font-monospace small text-primary break-all">
              {{ ex.url }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 2rem auto;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label {
  font-size: 0.875rem;
  color: var(--p-primary-color);
  font-weight: bold;
  cursor: pointer;
}

.col-span-2 {
  grid-column: span 2;
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
  grid-template-columns: 150px 250px 1fr 250px;
  gap: 1rem;
  font-weight: bold;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #cbd5e1;
}

.params-body {
  display: grid;
  grid-template-columns: 150px 250px 1fr 250px;
  gap: 1rem;
  align-items: center;
}

.query-header {
  display: grid;
  grid-template-columns: 50px 200px 1fr 250px 50px;
  gap: 1rem;
  font-weight: bold;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #cbd5e1;
}

.query-body {
  display: grid;
  grid-template-columns: 50px 200px 1fr 250px 50px;
  gap: 1rem;
  align-items: center;
}

.text-strike {
  text-decoration: line-through;
  color: #94a3b8;
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
.break-all {
  word-break: break-all;
}

.example-item {
  transition: background-color 0.2s;
}

.example-item:hover {
  background-color: #f1f5f9 !important;
}
</style>
