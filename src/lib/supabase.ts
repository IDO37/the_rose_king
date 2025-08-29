import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Initialize the Supabase client with your project URL and public API key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'rosenkoenig-web/1.0.0'
    }
  }
})

// Helper function to handle errors
export const handleError = (error: any, defaultMessage = 'An error occurred') => {
  console.error(error)
  return {
    error: error?.message || defaultMessage,
    details: error
  }
}

// Realtime subscription helper
export const subscribeToChanges = (channel: string, event: string, callback: (payload: any) => void) => {
  const subscription = supabase
    .channel(channel)
    .on('postgres_changes', { event: '*', schema: 'public' }, callback)
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

// File upload helper
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${path}/${fileName}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return { filePath, publicUrl }
}

// Delete file helper
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
  return true
}
