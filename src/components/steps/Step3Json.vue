<script setup lang="ts">
import { useDraftStore } from "../../stores/draft";
import { parseRequestJson } from "../../utils/parseJson";
import { useToast } from "primevue/usetoast";
import { FieldDef } from "../../types";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import FieldSheet from "../FieldSheet.vue";

const draftStore = useDraftStore();
const toast = useToast();

const handleRequestChange = (isManual = false) => {
  const currentTree = draftStore.config.requestFields;
  const raw = draftStore.config.requestJsonRaw;

  if (raw && (currentTree.length === 0 || isManual)) {
    try {
      const newTree = parseRequestJson(raw);

      // Merge descriptions by path to handle nested fields correctly
      const getDescMap = (fields: FieldDef[], path = "") => {
        const map = new Map<string, string>();
        fields.forEach((f) => {
          const key = path ? `${path}.${f.name}` : f.name;
          if (f.description) map.set(key, f.description);
          if (f.children) {
            const childMap = getDescMap(f.children, key);
            childMap.forEach((v, k) => map.set(k, v));
          }
        });
        return map;
      };

      const existingMap = getDescMap(currentTree);

      const applyMerge = (list: FieldDef[], path = "") => {
        list.forEach((f) => {
          const key = path ? `${path}.${f.name}` : f.name;
          if (existingMap.has(key)) {
            f.description = existingMap.get(key)!;
          }
          if (f.children && f.children.length > 0) {
            applyMerge(f.children, key);
          }
        });
      };
      applyMerge(newTree);

      draftStore.config.requestFields = newTree;
      if (isManual) {
        toast.add({
          severity: "info",
          summary: "解析完成",
          detail: "已重新根據 JSON 刷新欄位",
          life: 2000,
        });
      }
    } catch (e) {
      toast.add({
        severity: "error",
        summary: "解析失敗",
        detail: (e as Error).message,
        life: 3000,
      });
    }
  }
};

const addCustomField = () => {
  // Add to the root level
  draftStore.config.requestFields.push({
    id: crypto.randomUUID(),
    name: "new_field",
    type: "string",
    example: "",
    description: "",
    level: 0,
    expanded: true,
    isCustom: true,
    children: [],
  });
};
</script>

<template>
  <div class="step-container mw-100">
    <h2>Step 3: JSON BODY (Request)</h2>

    <div class="split-layout mt-3">
      <div class="json-side">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="fw-bold">Request JSON 範例</label>
          <Button
            label="重新解析欄位"
            icon="pi pi-refresh"
            size="small"
            variant="text"
            @click="handleRequestChange(true)"
          />
        </div>
        <Textarea
          v-model="draftStore.config.requestJsonRaw"
          rows="22"
          class="w-100 font-monospace border-primary-subtle shadow-sm"
          placeholder='{ "id": 1, "data": { "name": "test" } }'
          @blur="handleRequestChange(false)"
        />
      </div>

      <div class="fields-side">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="fw-bold">Request 欄位結構 (階層編輯)</label>
          <Button
            label="新增自訂欄位"
            icon="pi pi-plus-circle"
            size="small"
            text
            @click="addCustomField"
          />
        </div>

        <FieldSheet
          v-model="draftStore.config.requestFields"
          scrollHeight="550px"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-100 {
  max-width: 1400px;
  width: 100%;
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  align-items: start;
}

.font-monospace {
  font-size: 0.85rem;
}
</style>
