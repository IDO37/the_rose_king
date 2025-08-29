import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: 'Home - Rosenkönig' }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/pages/auth/AuthPage.vue'),
    meta: { title: 'Sign In - Rosenkönig', guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/components/auth/LoginForm.vue'),
        meta: { title: 'Sign In - Rosenkönig' }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/components/auth/RegisterForm.vue'),
        meta: { title: 'Create Account - Rosenkönig' }
      },
      {
        path: 'forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/components/auth/ForgotPassword.vue'),
        meta: { title: 'Reset Password - Rosenkönig' }
      },
      {
        path: '',
        redirect: { name: 'Login' }
      }
    ]
  },
  {
    path: '/lobby',
    name: 'Lobby',
    component: () => import('@/pages/LobbyPage.vue'),
    meta: { title: 'Game Lobby - Rosenkönig', requiresAuth: true }
  },
  {
    path: '/game/:id',
    name: 'Game',
    component: () => import('@/pages/GamePage.vue'),
    meta: { title: 'Game - Rosenkönig', requiresAuth: true },
    props: true
  },
  {
    path: '/rankings',
    name: 'Rankings',
    component: () => import('@/pages/RankingsPage.vue'),
    meta: { title: 'Rankings - Rosenkönig' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { title: 'My Profile - Rosenkönig', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
    meta: { title: 'Page Not Found - Rosenkönig' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 100 // Offset for header
      }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const toast = useToast()
  
  // Set page title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      // Redirect to login if not authenticated
      toast.warning('Please sign in to access this page')
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
  }

  // Redirect to home if already authenticated and trying to access guest-only routes
  if (to.matched.some(record => record.meta.guestOnly) && authStore.isAuthenticated) {
    return next({ name: 'Home' })
  }

  next()
})

// Handle navigation errors
router.onError((error, to) => {
  console.error('Navigation error:', error)
  const toast = useToast()
  toast.error('Failed to navigate to the requested page')
})

export default router
