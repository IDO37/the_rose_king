<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    color?: 'primary' | 'white' | 'gray'
  }>(),
  {
    size: 'md',
    color: 'primary',
  }
)

const sizeClasses = {
  xs: 'h-4 w-4 border-2',
  sm: 'h-6 w-6 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
}

const colorClasses = {
  primary: 'border-rose-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-400 border-t-transparent',
}
</script>

<template>
  <div class="flex items-center justify-center">
    <div
      class="animate-spin rounded-full"
      :class="[sizeClasses[size], colorClasses[color]]"
      role="status"
    >
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
