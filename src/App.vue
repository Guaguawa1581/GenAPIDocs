<script setup lang="ts">
import { ref } from 'vue';
import Steps from 'primevue/steps';
import Button from 'primevue/button';
import { useDraftStore } from './stores/draft';
import Step1Template from './components/steps/Step1Template.vue';
import Step2Meta from './components/steps/Step2Meta.vue';
import Step3Json from './components/steps/Step3Json.vue';
import Step4Fields from './components/steps/Step4Fields.vue';
import Step5Export from './components/steps/Step5Export.vue';

const draftStore = useDraftStore();
const activeStep = ref(0);
const items = ref([
  { label: '選擇模板' },
  { label: '基本資訊 (URL)' },
  { label: 'JSON BODY' },
  { label: 'Response 區' },
  { label: '匯出' }
]);

const nextStep = () => {
  if (activeStep.value === 1 && !draftStore.config.apiMeta.title) {
    alert('請輸入功能名稱以繼續');
    return;
  }
  // Skip Step 3 (JSON BODY) if GET
  if (activeStep.value === 1 && draftStore.config.apiMeta.method === 'GET') {
    activeStep.value += 2;
    return;
  }
  activeStep.value++;
};

const prevStep = () => {
  if (activeStep.value === 3 && draftStore.config.apiMeta.method === 'GET') {
    activeStep.value -= 2;
    return;
  }
  activeStep.value--;
};
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-content">
        <i class="pi pi-file-excel logo-icon"></i>
        <h1>API 文件 Excel 產生器</h1>
        <span class="version">v1.0.0</span>
      </div>
    </header>

    <main class="app-main">
      <div class="stepper-wrapper">
        <Steps v-model="activeStep" :model="items" :readonly="false" class="custom-steps" />
      </div>

      <div class="step-content-wrapper">
        <Step1Template v-if="activeStep === 0" />
        <Step2Meta v-else-if="activeStep === 1" />
        <Step3Json v-else-if="activeStep === 2" />
        <Step4Fields v-else-if="activeStep === 3" />
        <Step5Export v-else-if="activeStep === 4" />
      </div>

      <div class="navigation-buttons">
        <Button 
          v-if="activeStep > 0" 
          label="上一步" 
          icon="pi pi-arrow-left" 
          text 
          @click="prevStep" 
        />
        <div class="spacer"></div>
        <Button 
          v-if="activeStep < items.length - 1" 
          label="下一步" 
          icon="pi pi-arrow-right" 
          iconPos="right" 
          @click="nextStep" 
        />
      </div>
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2024 API Excel Generator - 離線可用</p>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #3b82f6;
  --bg-color: #f8fafc;
  --text-color: #1e293b;
}

body {
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
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
  color: #10b981;
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
  margin-bottom: 3rem;
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

.spacer { flex: 1; }

.app-footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
}

/* Custom styles for PrimeVue Steps */
.p-steps .p-steps-item:before {
  border-top: 2px solid #e2e8f0;
}

.p-steps .p-steps-item.p-highlight .p-steps-number {
  background: var(--primary-color);
  color: white;
}

/* Reset some default app styles */
#app {
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: left !important;
}
</style>
