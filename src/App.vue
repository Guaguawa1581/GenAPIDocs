<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
import Button from 'primevue/button';
import { useDraftStore } from './stores/draft';
import Step1Template from './components/steps/Step1Template.vue';
import Step2Meta from './components/steps/Step2Meta.vue';
import Step3Json from './components/steps/Step3Json.vue';
import Step4Fields from './components/steps/Step4Fields.vue';
import Step5Export from './components/steps/Step5Export.vue';
import Toast from 'primevue/toast';

const draftStore = useDraftStore();
const activeStep = ref(0);
const toast = useToast();

const items = computed(() => [
  { label: '選擇模板', disabled: false },
  { label: '基本資訊 (URL)', disabled: activeStep.value < 1 && !draftStore.config.templateType },
  { 
    label: 'JSON BODY', 
    disabled: (activeStep.value < 2 && !draftStore.config.apiMeta.title) || draftStore.config.apiMeta.method === 'GET' 
  },
  { label: 'Response 區', disabled: activeStep.value < 3 && !draftStore.config.apiMeta.title },
  { label: '匯出', disabled: activeStep.value < 4 && !draftStore.config.apiMeta.title }
]);

const nextStep = () => {
  if (activeStep.value === 1) {
    if (!draftStore.config.apiMeta.title) {
      toast.add({ severity: 'warn', summary: '提示', detail: '請輸入功能名稱以繼續', life: 3000 });
      return;
    }
    if (draftStore.config.apiMeta.method === 'GET') {
      activeStep.value = 3;
      return;
    }
  }
  
  if (activeStep.value < 4) {
    activeStep.value++;
  }
};

const prevStep = () => {
  if (activeStep.value === 3 && draftStore.config.apiMeta.method === 'GET') {
    activeStep.value = 1;
    return;
  }
  if (activeStep.value > 0) {
    activeStep.value--;
  }
};
</script>

<template>
  <div class="app-layout">
    <Toast />
    <header class="app-header">
      <div class="header-content">
        <i class="pi pi-file-excel logo-icon"></i>
        <h1>API 文件 Excel 產生器</h1>
        <span class="version">v1.0.0</span>
      </div>
    </header>

    <main class="app-main">
      <Stepper v-model:value="activeStep" class="custom-stepper">
        <div class="stepper-wrapper">
          <StepList>
            <Step v-for="(item, index) in items" :key="index" :value="index" :disabled="item.disabled">
              {{ item.label }}
            </Step>
          </StepList>
        </div>

        <div class="step-content-wrapper">
          <StepPanels>
            <StepPanel :value="0">
              <Step1Template @next="nextStep" />
            </StepPanel>
            <StepPanel :value="1">
              <Step2Meta />
            </StepPanel>
            <StepPanel :value="2">
              <Step3Json />
            </StepPanel>
            <StepPanel :value="3">
              <Step4Fields />
            </StepPanel>
            <StepPanel :value="4">
              <Step5Export />
            </StepPanel>
          </StepPanels>
        </div>

        <div class="navigation-buttons">
          <Button 
            v-if="activeStep > 0" 
            label="上一步" 
            icon="pi pi-arrow-left" 
            variant="text"
            @click="prevStep" 
          />
          <div class="flex-grow-1"></div>
          <Button 
            v-if="activeStep < items.length - 1" 
            label="下一步" 
            icon="pi pi-arrow-right" 
            iconPos="right" 
            @click="nextStep" 
          />
        </div>
      </Stepper>
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2024 API Excel Generator - 離線可用</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: var(--p-primary-color);
  --bg-color: #f8fafc;
  --text-color: #1e293b;
}

body {
  margin: 0;
  background-color: var(--bg-color);
  color: var(--p-text-color);
  font-family: 'Inter', sans-serif;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.logo-icon {
  font-size: 1.5rem;
  color: var(--p-emerald-500);
}

.app-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.version {
  font-size: 0.75rem;
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  color: #666;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}

.stepper-wrapper {
  margin-bottom: 2rem;
}

.step-content-wrapper {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.navigation-buttons {
  display: flex;
  margin-top: 2rem;
  padding: 0 1rem;
}

.app-footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
}

/* Stepper Custom Styles */
.p-steplist {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
    position: relative;
}

</style>
