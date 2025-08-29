import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const isLoading = ref(true)
  const toast = useToast()
  const router = useRouter()

  // Computed properties
  const isAuthenticated = computed(() => !!user.value)
  const userId = computed(() => user.value?.id || null)
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.user_metadata?.name || user.value?.email?.split('@')[0] || 'Player')
  const userAvatar = computed(() => user.value?.user_metadata?.avatar_url || '')

  // Initialize the auth store
  const initialize = async () => {
    try {
      // Get the current session if it exists
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      session.value = currentSession
      user.value = currentSession?.user || null
      
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        session.value = newSession
        user.value = newSession?.user || null
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          toast.success(`Welcome back, ${userName.value}!`)
          const redirect = router.currentRoute.value.query.redirect
          if (typeof redirect === 'string') {
            await router.push(redirect)
          } else {
            await router.push('/lobby')
          }
        } else if (event === 'SIGNED_OUT') {
          toast.info('You have been signed out')
          await router.push('/')
        } else if (event === 'PASSWORD_RECOVERY') {
          toast.info('Please check your email for the password reset link')
        }
      })
      
      // Return the unsubscribe function
      return () => {
        subscription?.unsubscribe()
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      toast.error('Failed to initialize authentication')
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { success: true }
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Failed to sign in')
      return { success: false, error }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
          }
        }
      })
      
      if (error) throw error
      
      toast.success('Account created successfully! Please check your email to confirm your account.')
      return { success: true, data }
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Failed to create account')
      return { success: false, error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      user.value = null
      session.value = null
      
      return { success: true }
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast.error(error.message || 'Failed to sign out')
      return { success: false, error }
    }
  }

  // Send password reset email
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      
      if (error) throw error
      
      toast.success('Password reset email sent. Please check your inbox.')
      return { success: true }
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to send password reset email')
      return { success: false, error }
    }
  }

  // Update user profile
  const updateProfile = async (updates: { name?: string; avatar_url?: string }) => {
    if (!user.value) return { success: false, error: 'Not authenticated' }
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.value.user_metadata,
          ...updates
        }
      })
      
      if (error) throw error
      
      // Refresh user data
      await initialize()
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error: any) {
      console.error('Update profile error:', error)
      toast.error(error.message || 'Failed to update profile')
      return { success: false, error }
    }
  }

  return {
    // State
    user,
    session,
    isLoading,
    
    // Getters
    isAuthenticated,
    userId,
    userEmail,
    userName,
    userAvatar,
    
    // Actions
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile
  }
}, {
  persist: {
    key: 'auth-storage',
    storage: localStorage,
    paths: ['user', 'session']
  }
})

// Types
type User = {
  id: string
  email: string
  user_metadata: {
    name?: string
    avatar_url?: string
  }
  // Add other user properties as needed
}

type Session = {
  access_token: string
  refresh_token: string
  user: User
  // Add other session properties as needed
}
