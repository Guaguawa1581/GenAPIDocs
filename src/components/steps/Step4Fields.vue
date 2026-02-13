<script setup lang="ts">
import { ref, computed } from "vue";
import { useDraftStore } from "../../stores/draft";
import {
  parseResponseJson,
  flattenFields,
  unflattenFields,
} from "../../utils/parseJson";
import { useToast } from "primevue/usetoast";
import { createDefaultResponse, ApiResponse, FieldDef } from "../../types";
import DataTable, { DataTableRowReorderEvent } from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import draggable from "vuedraggable";

const draftStore = useDraftStore();
const toast = useToast();
const activeTabId = ref(draftStore.config.responses[0]?.id || "");

const isComplex = (type: string) => type === "object" || type === "array";

const handleResponseChange = (resp: ApiResponse, isManual = false) => {
  if (resp.rawJson && (resp.fields.length === 0 || isManual)) {
    try {
      const newTree = parseResponseJson(resp.rawJson);

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

      const existingMap = getDescMap(resp.fields);

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

      resp.fields = newTree;
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
const addResponse = () => {
  const newResp = createDefaultResponse(200, "New Response");
  draftStore.config.responses.push(newResp);
  activeTabId.value = newResp.id;
};

const removeResponse = (id: string) => {
  const index = draftStore.config.responses.findIndex((r) => r.id === id);
  if (draftStore.config.responses.length > 1 && index !== -1) {
    draftStore.config.responses.splice(index, 1);
    // If the removed tab was active, switch to another one
    if (activeTabId.value === id) {
      const nextIndex = Math.min(index, draftStore.config.responses.length - 1);
      activeTabId.value = draftStore.config.responses[nextIndex].id;
    }
  }
};

const deleteField = (resp: ApiResponse, id: string) => {
  const removeRecursive = (list: FieldDef[]): boolean => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1);
        return true;
      }
      if (list[i].children && removeRecursive(list[i].children as FieldDef[])) {
        return true;
      }
    }
    return false;
  };
  removeRecursive(resp.fields);
};

const onRowReorder = (event: DataTableRowReorderEvent, resp: ApiResponse) => {
  const { dragIndex, dropIndex } = event;
  if (dragIndex === dropIndex) return;

  let allFlat = flattenFields(resp.fields);
  const displayed = getVisibleFields(allFlat);

  const sourceRow = displayed[dragIndex];
  let targetRow = displayed[dropIndex];

  const realDragIndex = allFlat.indexOf(sourceRow);
  const groupRows: FieldDef[] = [sourceRow];
  let j = realDragIndex + 1;
  while (j < allFlat.length && allFlat[j].level! > sourceRow.level!) {
    groupRows.push(allFlat[j]);
    j++;
  }

  if (!sourceRow.isCustom) {
    if (targetRow.level !== sourceRow.level) {
      toast.add({
        severity: "warn",
        summary: "移動受限",
        detail: "非自訂欄位僅能在同階層移動",
        life: 2000,
      });
      return;
    }
    const startIndex = Math.min(realDragIndex, allFlat.indexOf(targetRow));
    const endIndex = Math.max(realDragIndex, allFlat.indexOf(targetRow));
    for (let k = startIndex + 1; k < endIndex; k++) {
      if (allFlat[k].level! < sourceRow.level!) {
        toast.add({
          severity: "warn",
          summary: "移動受限",
          detail: "不可跨越父項目",
          life: 2000,
        });
        return;
      }
    }
  }

  allFlat.splice(realDragIndex, groupRows.length);
  const newRealTargetIndex = allFlat.indexOf(targetRow);

  let finalDropIndex = newRealTargetIndex;
  if (dropIndex > dragIndex) {
    let k = newRealTargetIndex + 1;
    while (k < allFlat.length && allFlat[k].level! > targetRow.level!) {
      k++;
    }
    finalDropIndex = k;
  }

  if (sourceRow.isCustom) {
    const prevNode = allFlat[finalDropIndex - 1];
    if (prevNode) {
      if (isComplex(prevNode.type)) {
        sourceRow.level = prevNode.level! + 1;
      } else {
        sourceRow.level = prevNode.level;
      }
    } else {
      sourceRow.level = 0;
    }
    const diff = sourceRow.level! - (groupRows[0].level || 0);
    if (diff !== 0) {
      groupRows.forEach((f) => {
        if (f !== sourceRow) f.level = (f.level || 0) + diff;
      });
    }
  }

  allFlat.splice(finalDropIndex, 0, ...groupRows);
  resp.fields = unflattenFields(allFlat);
};

const addCustomField = (resp: ApiResponse) => {
  resp.fields.push({
    id: crypto.randomUUID(),
    name: "custom_field",
    type: "string",
    example: "",
    description: "自定義欄位",
    level: 0,
    expanded: true,
    isCustom: true,
    children: [],
  });
};

const toggleExpand = (data: FieldDef) => {
  data.expanded = !data.expanded;
};

const getVisibleFields = (fullFlat: FieldDef[]) => {
  const visible: FieldDef[] = [];
  let skipUntilLevel: number | null = null;
  for (const f of fullFlat) {
    if (skipUntilLevel !== null) {
      if (f.level! > skipUntilLevel) continue;
      else skipUntilLevel = null;
    }
    visible.push(f);
    if (isComplex(f.type) && !f.expanded) skipUntilLevel = f.level!;
  }
  return visible;
};

const getStatusCodeColor = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode >= 300 && statusCode < 400) return "warning";
  if (statusCode >= 400 && statusCode < 500) return "danger";
  if (statusCode >= 500 && statusCode < 600) return "danger";
  return "secondary";
};
</script>

<template>
  <div class="step-container mw-100">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">Step 4: Responses (多重狀態設定)</h2>
      <div class="d-flex gap-2">
        <Button
          label="新增 Response 狀態"
          icon="pi pi-plus"
          size="small"
          @click="addResponse"
        />
      </div>
    </div>

    <Tabs v-model:value="activeTabId">
      <TabList>
        <draggable
          v-model="draftStore.config.responses"
          item-key="id"
          tag="div"
          class="d-flex flex-row"
          ghost-class="ghost-tab"
        >
          <template #item="{ element }">
            <Tab
              :value="element.id"
              class="resp-draggable-tab"
              @mousedown="activeTabId = element.id"
            >
              <div class="d-flex align-items-center">
                <Tag
                  :value="element.statusCode"
                  :severity="getStatusCodeColor(element.statusCode)"
                  class="me-2"
                />
                <span class="me-2">{{ element.statusText }}</span>
                <Button
                  v-if="draftStore.config.responses.length > 1"
                  icon="pi pi-times"
                  variant="text"
                  rounded
                  severity="danger"
                  class="small-close-btn"
                  @click.stop="removeResponse(element.id)"
                />
              </div>
            </Tab>
          </template>
        </draggable>
      </TabList>

      <TabPanels>
        <TabPanel
          v-for="resp in draftStore.config.responses"
          :key="resp.id"
          :value="resp.id"
        >
          <div class="response-editor-grid mt-3">
            <div class="resp-header mb-4 p-3 bg-light rounded border shadow-sm">
              <div class="row g-3">
                <div class="col-md-2">
                  <label class="form-label fw-bold small text-secondary"
                    >HTTP Code</label
                  >
                  <InputNumber
                    v-model="resp.statusCode"
                    :useGrouping="false"
                    class="w-100 p-0 custom-number-input"
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-bold small text-secondary"
                    >Status Text</label
                  >
                  <InputText v-model="resp.statusText" class="w-100 p-2" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-bold small text-secondary"
                    >說明 / 備註 (Excel 標記用)</label
                  >
                  <InputText
                    v-model="resp.note"
                    class="w-100 p-2"
                    placeholder="例如：發生查無資料時"
                  />
                </div>
              </div>
            </div>

            <div class="split-layout">
              <div class="json-side">
                <div
                  class="d-flex justify-content-between align-items-center mb-2"
                >
                  <label class="fw-bold text-primary">JSON 範例來源</label>
                  <Button
                    label="重新解析欄位"
                    icon="pi pi-refresh"
                    size="small"
                    variant="text"
                    @click="handleResponseChange(resp, true)"
                  />
                </div>
                <Textarea
                  v-model="resp.rawJson"
                  rows="18"
                  class="w-100 font-monospace border-primary-subtle shadow-sm"
                  placeholder='{ "id": 123, "data": { ... } }'
                  @blur="handleResponseChange(resp, false)"
                />
              </div>

              <div class="fields-side">
                <div
                  class="d-flex justify-content-between align-items-center mb-2"
                >
                  <label class="fw-bold">欄位結構 (階層編輯)</label>
                  <Button
                    label="新增自訂欄位"
                    icon="pi pi-plus-circle"
                    size="small"
                    text
                    @click="addCustomField(resp)"
                  />
                </div>

                <DataTable
                  :value="getVisibleFields(flattenFields(resp.fields))"
                  size="small"
                  scrollable
                  scrollHeight="500px"
                  class="text-left border rounded shadow-sm"
                  @row-reorder="(e) => onRowReorder(e, resp)"
                  dataKey="id"
                >
                  <Column rowReorder headerStyle="width: 3rem" />
                  <Column header="欄位名稱 (Key)" style="min-width: 12rem">
                    <template #body="{ data }">
                      <div
                        :style="{ paddingLeft: data.level * 1.5 + 'rem' }"
                        class="d-flex align-items-center gap-1"
                      >
                        <Button
                          v-if="isComplex(data.type)"
                          :icon="
                            data.expanded
                              ? 'pi pi-chevron-down'
                              : 'pi pi-chevron-right'
                          "
                          variant="text"
                          class="p-0"
                          style="
                            width: 1.25rem;
                            height: 1.25rem;
                            flex-shrink: 0;
                          "
                          @click="toggleExpand(data)"
                        />
                        <span
                          v-else-if="data.level > 0"
                          class="me-1 text-secondary opacity-50"
                          >└</span
                        >

                        <div class="position-relative w-100">
                          <InputText
                            v-model="data.name"
                            class="p-1 font-monospace w-100 border-0 bg-transparent edit-focus"
                          />
                          <div class="bottom-line"></div>
                        </div>
                        <Tag
                          v-if="isComplex(data.type)"
                          severity="info"
                          size="small"
                          value="Obj"
                        />
                        <Tag
                          v-if="data.isCustom"
                          severity="warn"
                          size="small"
                          value="User"
                        />
                      </div>
                    </template>
                  </Column>
                  <!-- <Column field="type" header="型態" style="width: 6rem">
                    <template #body="{ data }">
                      <span class="small text-secondary">{{ data.type }}</span>
                    </template>
                  </Column> -->
                  <Column header="意思 (Description)" style="width: 18rem">
                    <template #body="{ data }">
                      <InputText
                        v-model="data.description"
                        class="w-100 p-1 border-0 border-bottom rounded-0"
                        placeholder="說明文字"
                      />
                    </template>
                  </Column>
                  <Column header="操作" style="width: 4rem">
                    <template #body="{ data }">
                      <Button
                        icon="pi pi-trash"
                        variant="text"
                        severity="danger"
                        size="small"
                        @click="deleteField(resp, data.id)"
                      />
                    </template>
                  </Column>
                </DataTable>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
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

.border {
  border: 1px solid #e2e8f0;
}
.rounded {
  border-radius: 8px;
}

:deep(.p-tabpanel) {
  padding: 0;
}

:deep(.p-tabs) {
  background: transparent;
}

.font-monospace {
  font-size: 0.85rem;
}

.small-close-btn {
  width: 1rem !important;
  height: 1rem !important;
  padding: 0 !important;
  font-size: 0.6rem;
}

.edit-focus:focus {
  box-shadow: none;
  background: rgba(59, 130, 246, 0.05) !important;
}

.bottom-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

:deep(.p-datatable-reorderler-handle) {
  cursor: grab;
  color: #94a3b8;
}

.drag-handle {
  cursor: grab;
  font-size: 0.8rem;
}

.ghost-tab {
  opacity: 0.5;
  background: #c8ebfb !important;
}

.resp-draggable-tab {
  padding: 0.5rem 1rem;
  cursor: grab;
}
.resp-draggable-tab:active {
  cursor: grabbing;
}

:deep(.p-tab-active) {
  color: inherit !important;
}

:deep(.custom-number-input .p-inputnumber-input) {
  padding: 0.5rem;
  width: 100%;
}
</style>
