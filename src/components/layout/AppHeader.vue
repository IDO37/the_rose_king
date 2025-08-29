<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useToast } from 'vue-toastification'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const mobileMenuOpen = ref(false)

const navigation = [
  { name: 'Home', href: '/', requiresAuth: false },
  { name: 'Play', href: '/lobby', requiresAuth: true },
  { name: 'Rankings', href: '/rankings', requiresAuth: false },
]

const userNavigation = [
  { name: 'Your Profile', href: '/profile' },
  { name: 'Settings', href: '/settings' },
  { name: 'Sign out', action: 'signOut' },
]

const currentRoute = computed(() => router.currentRoute.value.path)

const isActive = (path: string) => {
  return currentRoute.value === path
}

const handleNavigation = async (item: { href?: string; action?: string }) => {
  if (item.action === 'signOut') {
    try {
      await authStore.signOut()
      toast.success('Successfully signed out')
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  } else if (item.href) {
    router.push(item.href)
  }
}
</script>

<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm">
    <nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
      <div class="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <!-- Logo -->
        <div class="flex items-center
                    ">
          <router-link to="/" class="flex items-center">
            <span class="text-2xl font-bold text-rose-600">Rosenkönig</span>
          </router-link>
        </div>

        <!-- Mobile menu button -->
        <div class="flex items-center md:hidden">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!mobileMenuOpen" class="h-6 w-6" aria-hidden="true" />
            <XMarkIcon v-else class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <!-- Desktop navigation -->
        <div class="hidden md:ml-10 md:flex md:items-center md:space-x-8">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            :class="[
              isActive(item.href)
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-500 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400',
              'inline-flex items-center px-1 pt-1 text-sm font-medium'
            ]"
            v-show="!item.requiresAuth || (item.requiresAuth && authStore.isAuthenticated)"
          >
            {{ item.name }}
          </router-link>
        </div>

        <!-- Auth buttons -->
        <div v-if="!authStore.isAuthenticated" class="hidden md:flex items-center space-x-4">
          <router-link
            to="/auth/login"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-rose-700 bg-rose-100 hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Sign in
          </router-link>
          <router-link
            to="/auth/register"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Sign up
          </router-link>
        </div>

        <!-- User dropdown -->
        <Menu v-else as="div" class="relative ml-4 hidden md:block">
          <div>
            <MenuButton class="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">
              <span class="sr-only">Open user menu</span>
              <div class="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-300 font-medium">
                {{ authStore.userName.charAt(0).toUpperCase() }}
              </div>
            </MenuButton>
          </div>
          <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }" @click="handleNavigation(item)">
                <a
                  href="#"
                  :class="[
                    active ? 'bg-gray-100 dark:bg-gray-700' : '',
                    'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                  ]"
                >
                  {{ item.name }}
                </a>
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </nav>

    <!-- Mobile menu -->
    <div v-show="mobileMenuOpen" class="md:hidden">
      <div class="space-y-1 pb-3 pt-2">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          :class="[
            isActive(item.href)
              ? 'bg-rose-50 border-rose-500 text-rose-700'
              : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800',
            'block border-l-4 py-2 pl-3 pr-4 text-base font-medium'
          ]"
          v-show="!item.requiresAuth || (item.requiresAuth && authStore.isAuthenticated)"
          @click="mobileMenuOpen = false"
        >
          {{ item.name }}
        </router-link>
      </div>
      
      <div v-if="!authStore.isAuthenticated" class="border-t border-gray-200 pb-3 pt-4">
        <div class="space-y-1">
          <router-link
            to="/auth/login"
            class="block w-full px-4 py-2 text-base font-medium text-center text-rose-600 hover:bg-gray-50 hover:text-rose-700"
            @click="mobileMenuOpen = false"
          >
            Sign in
          </router-link>
          <router-link
            to="/auth/register"
            class="block w-full px-4 py-2 text-base font-medium text-center text-white bg-rose-600 hover:bg-rose-700"
            @click="mobileMenuOpen = false"
          >
            Sign up
          </router-link>
        </div>
      </div>
      
      <div v-else class="border-t border-gray-200 pb-3 pt-4">
        <div class="flex items-center px-4">
          <div class="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-300 font-medium">
            {{ authStore.userName.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <div class="text-base font-medium text-gray-800 dark:text-white">{{ authStore.userName }}</div>
            <div class="text-sm font-medium text-gray-500 dark:text-gray-300">{{ authStore.userEmail }}</div>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <router-link
            v-for="item in userNavigation"
            :key="item.name"
            v-if="!item.action"
            :to="item.href"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            @click="mobileMenuOpen = false"
          >
            {{ item.name }}
          </router-link>
          <button
            v-else
            @click="handleNavigation(item); mobileMenuOpen = false"
            class="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {{ item.name }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
