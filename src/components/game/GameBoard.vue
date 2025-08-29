<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { useToast } from 'vue-toastification'
import AppLoading from '@/components/ui/AppLoading.vue'

const props = defineProps({
  interactive: {
    type: Boolean,
    default: true
  },
  highlightMoves: {
    type: Boolean,
    default: true
  },
  showCoordinates: {
    type: Boolean,
    default: false
  },
  cellSize: {
    type: Number,
    default: 60
  }
})

const emit = defineEmits(['cell-click', 'cell-hover', 'cell-leave', 'move-made'])

const gameStore = useGameStore()
const toast = useToast()

// Refs
const boardRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartCell = ref<{x: number, y: number} | null>(null)
const dragEndCell = ref<{x: number, y: number} | null>(null)
const hoveredCell = ref<{x: number, y: number} | null>(null)
const validMoves = ref<Array<{x: number, y: number}>>([])
const selectedCard = ref<string | null>(null)

// Computed properties
const boardSize = computed(() => ({
  width: `${props.cellSize * 9}px`,
  height: `${props.cellSize * 9}px`
}))

const cellStyle = computed(() => ({
  width: `${props.cellSize}px`,
  height: `${props.cellSize}px`,
  fontSize: `${Math.max(12, props.cellSize * 0.5)}px`
}))

const isInteractive = computed(() => {
  return props.interactive && gameStore.isPlayerTurn
})

// Methods
const getCellClass = (x: number, y: number) => {
  const cell = gameStore.getCell(x, y)
  const classes = ['cell', `cell-${x}-${y}`]
  
  // Add owner class
  if (cell) {
    classes.push(`owner-${cell.owner}`)
  }
  
  // Check if cell is the crown position
  if (gameStore.currentGame && x === gameStore.currentGame.crown_x && y === gameStore.currentGame.crown_y) {
    classes.push('has-crown')
  }
  
  // Highlight valid moves
  if (props.highlightMoves && isInteractive.value) {
    const isValidMove = validMoves.value.some(move => move.x === x && move.y === y)
    if (isValidMove) {
      classes.push('valid-move')
    }
  }
  
  // Highlight hovered cell
  if (hoveredCell.value && hoveredCell.value.x === x && hoveredCell.value.y === y) {
    classes.push('hovered')
  }
  
  // Highlight drag target
  if (dragEndCell.value && dragEndCell.value.x === x && dragEndCell.value.y === y) {
    classes.push('drag-target')
  }
  
  return classes
}

const getCellContent = (x: number, y: number) => {
  if (gameStore.currentGame && x === gameStore.currentGame.crown_x && y === gameStore.currentGame.crown_y) {
    return '👑'
  }
  return ''
}

const handleCellClick = (x: number, y: number) => {
  if (!isInteractive.value) return
  
  // If we have a selected card, try to play it
  if (selectedCard.value) {
    playCard(selectedCard.value, x, y)
    return
  }
  
  // Otherwise, emit the cell click event
  emit('cell-click', { x, y })
  
  // If this is a valid move, emit the move-made event
  const isValidMove = validMoves.value.some(move => move.x === x && move.y === y)
  if (isValidMove) {
    emit('move-made', { from: dragStartCell.value, to: { x, y } })
    resetDragState()
  } else {
    // Start a new drag operation
    dragStartCell.value = { x, y }
    updateValidMoves(x, y)
  }
}

const handleCellHover = (x: number, y: number) => {
  hoveredCell.value = { x, y }
  emit('cell-hover', { x, y })
  
  if (isDragging.value && dragStartCell.value) {
    dragEndCell.value = { x, y }
  }
}

const handleCellLeave = () => {
  hoveredCell.value = null
  emit('cell-leave')
}

const handleMouseDown = (x: number, y: number) => {
  if (!isInteractive.value) return
  
  isDragging.value = true
  dragStartCell.value = { x, y }
  dragEndCell.value = null
  updateValidMoves(x, y)
}

const handleMouseUp = (x: number, y: number) => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  if (dragStartCell.value) {
    const fromX = dragStartCell.value.x
    const fromY = dragStartCell.value.y
    
    // Only emit if we've dragged to a different cell
    if (fromX !== x || fromY !== y) {
      const isValidMove = validMoves.value.some(move => move.x === x && move.y === y)
      if (isValidMove) {
        emit('move-made', { from: dragStartCell.value, to: { x, y } })
      }
    }
  }
  
  resetDragState()
}

const resetDragState = () => {
  isDragging.value = false
  dragStartCell.value = null
  dragEndCell.value = null
  validMoves.value = []
}

const updateValidMoves = (fromX: number, fromY: number) => {
  if (!gameStore.currentGame) return
  
  // In a real implementation, this would calculate valid moves based on game rules
  // For now, we'll just show all adjacent cells as valid moves
  const moves = []
  
  // Check all 8 directions
  const directions = [
    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 0 },                      { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
  ]
  
  for (const dir of directions) {
    const x = fromX + dir.dx
    const y = fromY + dir.dy
    
    // Check if the cell is within bounds
    if (x >= 0 && x < 9 && y >= 0 && y < 9) {
      // Check if the cell is empty or can be captured
      const cell = gameStore.getCell(x, y)
      if (!cell || cell.owner === 'none' || cell.owner !== gameStore.currentPlayer) {
        moves.push({ x, y })
      }
    }
  }
  
  validMoves.value = moves
}

const playCard = async (cardId: string, x: number, y: number) => {
  if (!gameStore.currentGame) return
  
  try {
    await gameStore.makeMove(cardId, x, y)
    selectedCard.value = null
    toast.success('Move made successfully')
  } catch (error) {
    console.error('Error making move:', error)
    toast.error('Failed to make move')
  }
}

const selectCard = (cardId: string) => {
  selectedCard.value = selectedCard.value === cardId ? null : cardId
  validMoves.value = [] // Reset valid moves when selecting a card
  
  // In a real implementation, we would calculate valid moves for the selected card
  // For now, we'll just clear the valid moves
}

// Lifecycle hooks
onMounted(() => {
  // Add keyboard event listeners
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isInteractive.value) return
    
    // Handle arrow keys for keyboard navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      
      if (!hoveredCell.value) {
        // Start from the center if no cell is hovered
        hoveredCell.value = { x: 4, y: 4 }
      } else {
        // Move in the direction of the arrow key
        const { x, y } = hoveredCell.value
        
        switch (e.key) {
          case 'ArrowUp':
            if (y > 0) hoveredCell.value = { x, y: y - 1 }
            break
          case 'ArrowDown':
            if (y < 8) hoveredCell.value = { x, y: y + 1 }
            break
          case 'ArrowLeft':
            if (x > 0) hoveredCell.value = { x: x - 1, y }
            break
          case 'ArrowRight':
            if (x < 8) hoveredCell.value = { x: x + 1, y }
            break
        }
      }
      
      // Scroll the board to keep the hovered cell in view
      if (hoveredCell.value && boardRef.value) {
        const cellElement = boardRef.value.querySelector(`.cell-${hoveredCell.value.x}-${hoveredCell.value.y}`) as HTMLElement
        if (cellElement) {
          cellElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          })
        }
      }
    }
    
    // Handle Enter key to select a cell
    if (e.key === 'Enter' && hoveredCell.value) {
      handleCellClick(hoveredCell.value.x, hoveredCell.value.y)
    }
    
    // Handle Escape key to cancel the current action
    if (e.key === 'Escape') {
      resetDragState()
      selectedCard.value = null
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  // Clean up event listeners
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

// Watch for game state changes
watch(() => gameStore.currentGame, (newGame) => {
  if (newGame) {
    // Reset the board state when the game changes
    resetDragState()
    selectedCard.value = null
  }
}, { deep: true })
</script>

<template>
  <div class="game-board-container">
    <!-- Loading overlay -->
    <div v-if="gameStore.isLoading" class="loading-overlay">
      <AppLoading size="lg" />
      <p class="mt-4 text-lg font-medium">Loading game...</p>
    </div>
    
    <!-- Game board -->
    <div 
      ref="boardRef"
      class="game-board relative mx-auto bg-white dark:bg-gray-800 overflow-hidden"
      :style="boardSize"
    >
      <!-- Grid background -->
      <div 
        v-for="y in 9" :key="`row-${y-1}`" 
        class="flex"
      >
        <div 
          v-for="x in 9" :key="`cell-${x-1}-${y-1}`"
          class="border border-gray-200 dark:border-gray-700 flex items-center justify-center relative"
          :class="getCellClass(x-1, y-1)"
          :style="cellStyle"
          @click="handleCellClick(x-1, y-1)"
          @mouseover="handleCellHover(x-1, y-1)"
          @mouseleave="handleCellLeave"
          @mousedown="handleMouseDown(x-1, y-1)"
          @mouseup="handleMouseUp(x-1, y-1)"
        >
          <!-- Cell coordinates (for debugging) -->
          <span 
            v-if="showCoordinates" 
            class="absolute top-0 left-0 text-xs text-gray-400"
          >
            {{ x-1 }},{{ y-1 }}
          </span>
          
          <!-- Cell content (crown, etc.) -->
          <span class="cell-content">
            {{ getCellContent(x-1, y-1) }}
          </span>
          
          <!-- Drag indicator -->
          <div 
            v-if="dragStartCell && dragStartCell.x === x-1 && dragStartCell.y === y-1"
            class="absolute inset-0 border-2 border-dashed border-rose-500 rounded pointer-events-none"
          ></div>
          
          <!-- Valid move indicator -->
          <div 
            v-if="validMoves.some(move => move.x === x-1 && move.y === y-1)"
            class="absolute inset-0 bg-rose-100 dark:bg-rose-900/30 opacity-50 rounded pointer-events-none"
          ></div>
        </div>
      </div>
      
      <!-- Drag preview (shows where the piece will be placed) -->
      <div 
        v-if="dragStartCell && dragEndCell && (dragStartCell.x !== dragEndCell.x || dragStartCell.y !== dragEndCell.y)"
        class="absolute bg-rose-100/50 border-2 border-dashed border-rose-500 rounded pointer-events-none"
        :style="{
          left: `${dragEndCell.x * props.cellSize}px`,
          top: `${dragEndCell.y * props.cellSize}px`,
          width: `${props.cellSize}px`,
          height: `${props.cellSize}px`,
          zIndex: 10
        }"
      ></div>
    </div>
    
    <!-- Game status -->
    <div v-if="gameStore.currentGame" class="mt-4 text-center">
      <div v-if="gameStore.gameStatus === 'waiting'" class="text-yellow-600 dark:text-yellow-400">
        Waiting for opponent to join...
      </div>
      <div v-else-if="gameStore.gameStatus === 'finished'">
        <div v-if="gameStore.currentGame.winner" class="text-2xl font-bold">
          {{ gameStore.currentGame.winner === 'A' ? 'Player A' : 'Player B' }} wins!
        </div>
        <div v-else class="text-lg">
          Game ended in a draw
        </div>
      </div>
      <div v-else>
        <div class="text-lg font-medium">
          Current turn: {{ gameStore.currentPlayer === 'A' ? 'Player A' : 'Player B' }}
          <span v-if="gameStore.isPlayerTurn" class="ml-2 px-2 py-1 text-xs bg-rose-100 text-rose-800 rounded-full">
            Your turn
          </span>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Score: {{ gameStore.currentGame.score_a || 0 }} - {{ gameStore.currentGame.score_b || 0 }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-board-container {
  position: relative;
  display: inline-block;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 20;
}

.game-board {
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.cell {
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  background-color: #f9fafb;
}

.cell.owner-A {
  background-color: #fecdd3; /* rose-200 */
  color: #9f1239; /* rose-900 */
}

.cell.owner-B {
  background-color: #bfdbfe; /* blue-200 */
  color: #1e3a8a; /* blue-900 */
}

.cell.has-crown {
  font-weight: bold;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
}

.cell.hovered {
  box-shadow: inset 0 0 0 2px #f43f5e; /* rose-500 */
  z-index: 5;
}

.cell.valid-move {
  box-shadow: inset 0 0 0 2px #10b981; /* emerald-500 */
}

.cell.drag-target {
  background-color: rgba(244, 63, 94, 0.2); /* rose-500 with opacity */
}

.cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.5em;
  user-select: none;
}

/* Dark mode styles */
.dark .cell {
  background-color: #1f2937; /* gray-800 */
  border-color: #374151; /* gray-700 */
}

.dark .cell.owner-A {
  background-color: #831843; /* rose-900 */
  color: #fbcfe8; /* pink-200 */
}

.dark .cell.owner-B {
  background-color: #1e40af; /* blue-900 */
  color: #bfdbfe; /* blue-200 */
}

.dark .cell.has-crown {
  background-image: radial-gradient(circle, rgba(31, 41, 55, 0.8) 0%, transparent 70%);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .game-board {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
  }
  
  .cell {
    aspect-ratio: 1 / 1;
  }
}
</style>
