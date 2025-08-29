<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppLoading from '@/components/ui/AppLoading.vue'

const authStore = useAuthStore()
const toast = useToast()

// Initialize app
onMounted(async () => {
  try {
    await authStore.initialize()
  } catch (error) {
    console.error('Failed to initialize app:', error)
    toast.error('Failed to initialize application. Please refresh the page.')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <AppHeader />
    
    <main class="flex-grow container mx-auto px-4 py-6">
      <RouterView v-slot="{ Component }">
        <Suspense timeout="0">
          <component :is="Component" />
          
          <template #fallback>
            <div class="flex items-center justify-center h-64">
              <AppLoading />
            </div>
          </template>
        </Suspense>
      </RouterView>
    </main>
    
    <AppFooter />
    
    <!-- Toast notifications container -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-50 w-full max-w-xs"></div>
  </div>
</template>

<style>
/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
