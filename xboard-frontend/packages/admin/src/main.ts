import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/index.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { setupVeeValidate } from './plugins/vee-validate'
import apiClient from '@xboard/shared/api/client'
import { useAuthStore } from './stores/auth'

// Setup VeeValidate
setupVeeValidate()

async function bootstrap() {
  // Create app first
  const app = createApp(App)
  
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  app.use(i18n)

  const authStore = useAuthStore(pinia)
  apiClient.setTokenGetter(() => authStore.token)
  
  // Note: secure_path is now handled in client.ts via VITE_SECURE_PATH env variable
  // No need to fetch from backend or add interceptor here
  
  app.mount('#app')
}

bootstrap()
