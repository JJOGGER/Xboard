import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './styles/index.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { setupVeeValidate } from './plugins/vee-validate'
import { useAuthStore } from './stores/auth'

// Setup VeeValidate
setupVeeValidate()

const app = createApp(App)

// Setup Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(i18n)

// Initialize auth store before mounting
const authStore = useAuthStore()
authStore.initialize().catch(() => {
  // Silently handle initialization errors
  // User will be redirected to login by router guard if needed
})

app.mount('#app')
