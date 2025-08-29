import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// Initialize Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Create and mount the app
const app = createApp(App)

app.use(pinia)
app.use(router)

// Mount the app
app.mount('#app')

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', { err, instance, info })
  // You can add custom error reporting here (e.g., Sentry)
}
