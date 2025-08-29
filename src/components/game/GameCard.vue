<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/types/supabase'

const props = defineProps<{
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{
  (e: 'select', cardId: string): void
  (e: 'play', cardId: string): void
}>()

const sizeClasses = {
  sm: 'w-16 h-24 text-sm',
  md: 'w-20 h-28 text-base',
  lg: 'w-24 h-36 text-lg'
}

const cardClass = computed(() => ({
  'game-card': true,
  'game-card--selected': props.isSelected,
  'game-card--playable': props.isPlayable && !props.disabled,
  'game-card--disabled': props.disabled,
  'cursor-pointer': !props.disabled,
  [sizeClasses[props.size || 'md']]: true
}))

const cardType = computed(() => {
  return props.card.kind === 'influence' ? 'Influence' : 'Hero'
})

const moveDescription = computed(() => {
  const dx = props.card.dx
  const dy = props.card.dy
  const steps = props.card.steps || 1
  
  if (dx === 0 && dy === -1) return `Move ${steps} ↑`
  if (dx === 1 && dy === 0) return `Move ${steps} →`
  if (dx === 0 && dy === 1) return `Move ${steps} ↓`
  if (dx === -1 && dy === 0) return `Move ${steps} ←`
  
  // Diagonal moves
  if (dx > 0 && dy < 0) return `Move ${steps} ↗`
  if (dx > 0 && dy > 0) return `Move ${steps} ↘`
  if (dx < 0 && dy > 0) return `Move ${steps} ↙`
  if (dx < 0 && dy < 0) return `Move ${steps} ↖`
  
  // Special moves
  if (dx === 2 || dy === 2 || dx === -2 || dy === -2) {
    return 'Special Move'
  }
  
  return 'Move Card'
})

const handleClick = () => {
  if (props.disabled) return
  
  if (props.isPlayable) {
    emit('play', props.card.id)
  } else {
    emit('select', props.card.id)
  }
}
</script>

<template>
  <div 
    :class="cardClass"
    @click="handleClick"
  >
    <div class="game-card__inner">
      <div class="game-card__header">
        <span class="game-card__type">{{ cardType }}</span>
        <span class="game-card__owner" :class="`owner-${card.owner}`">
          {{ card.owner === 'A' ? 'A' : 'B' }}
        </span>
      </div>
      
      <div class="game-card__content">
        <div class="game-card__move">
          {{ moveDescription }}
        </div>
        <div v-if="card.steps > 1" class="game-card__steps">
          {{ card.steps }} steps
        </div>
      </div>
      
      <div class="game-card__footer">
        <div v-if="card.is_used" class="game-card__used">
          Used
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-card {
  position: relative;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  overflow: hidden;
  user-select: none;
  font-family: 'Inter', sans-serif;
  border: 2px solid #e5e7eb;
}

.game-card__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
}

.game-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.game-card__type {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625em;
}

.game-card__owner {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.75em;
  color: white;
}

.owner-A {
  background-color: #f43f5e; /* rose-500 */
}

.owner-B {
  background-color: #3b82f6; /* blue-500 */
}

.game-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: 600;
  color: #1f2937;
  padding: 0.25rem 0;
}

.game-card__move {
  font-size: 1em;
  margin-bottom: 0.25rem;
}

.game-card__steps {
  font-size: 0.75em;
  color: #6b7280;
  margin-top: 0.25rem;
}

.game-card__footer {
  margin-top: auto;
  font-size: 0.75em;
  color: #6b7280;
  text-align: center;
}

.game-card__used {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75em;
  color: #9ca3af;
}

/* Hover & Active States */
.game-card--playable:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: #f43f5e; /* rose-500 */
}

.game-card--selected {
  border-color: #3b82f6; /* blue-500 */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.game-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(50%);
}

/* Dark mode styles */
.dark .game-card {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

.dark .game-card__type {
  background: #374151;
  color: #d1d5db;
}

dark .game-card__content {
  color: #f9fafb;
}

dark .game-card__steps,
dark .game-card__footer {
  color: #9ca3af;
}

dark .game-card__used {
  background: #374151;
  color: #6b7280;
}

/* Size variations */
.w-16 .game-card__move {
  font-size: 0.75em;
}

.w-16 .game-card__header {
  font-size: 0.625em;
}

.w-24 .game-card__move {
  font-size: 1.125em;
}

.w-24 .game-card__header {
  font-size: 0.875em;
}
</style>
