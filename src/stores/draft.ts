import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { ApiDocConfig, DEFAULT_CONFIG } from '../types';

export const useDraftStore = defineStore('draft', () => {
  const saved = localStorage.getItem('api_doc_draft');
  const initialData = saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  
  // Migration: Handle old pathParams key
  if (initialData.pathParams && !initialData.routeParams) {
    initialData.routeParams = initialData.pathParams;
    delete initialData.pathParams;
  }

  // Safety: Ensure arrays exist to prevent .length errors
  if (!initialData.routeParams) initialData.routeParams = [];
  if (!initialData.queryParams) initialData.queryParams = [];
  if (!initialData.requestFields) initialData.requestFields = [];
  if (!initialData.responses) {
    initialData.responses = JSON.parse(JSON.stringify(DEFAULT_CONFIG.responses));
  } else {
    // Migration: ensure each response has an id and fields array
    initialData.responses.forEach((r: any) => {
        if (!r.id) r.id = crypto.randomUUID();
        if (!r.fields) r.fields = [];
    });
  }
  // Cleanup obsolete top-level fields
  delete initialData.responseFields;
  delete initialData.responseJsonRaw;

  const config = ref<ApiDocConfig>(initialData);

  const saveToLocal = () => {
    localStorage.setItem('api_doc_draft', JSON.stringify(config.value));
  };

  const clearDraft = () => {
    config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    saveToLocal();
  };

  watch(config, saveToLocal, { deep: true });

  return {
    config,
    clearDraft,
  };
});
