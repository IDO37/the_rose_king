<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import GameBoard from '@/components/game/GameBoard.vue'
import GameCard from '@/components/game/GameCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLoading from '@/components/ui/AppLoading.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const authStore = useAuthStore()
const toast = useToast()

// Game state
const selectedCardId = ref<string | null>(null)
const isLeaving = ref(false)
const isForfeiting = ref(false)
const showConfirmLeave = ref(false)
const showConfirmForfeit = ref(false)

// Computed properties
const gameId = computed(() => route.params.id as string)
const isPlayer = computed(() => gameStore.isPlayerA || gameStore.isPlayerB)
const isSpectator = computed(() => !isPlayer.value && gameStore.currentGame)
const playerACards = computed(() => gameStore.getPlayerCards('A'))
const playerBCards = computed(() => gameStore.getPlayerCards('B'))
const currentPlayerCards = computed(() => {
  return gameStore.isPlayerA ? playerACards.value : playerBCards.value
})
const opponentCards = computed(() => {
  return gameStore.isPlayerA ? playerBCards.value : playerACards.value
})

// Lifecycle hooks
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    toast.warning('Please sign in to play')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  
  await loadGame()
  
  // Handle browser back/close events
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  // Clean up event listeners
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // Reset game state when leaving the page
  if (!isLeaving.value) {
    gameStore.resetGame()
  }
})

// Watch for game status changes
watch(() => gameStore.gameStatus, (newStatus) => {
  if (newStatus === 'finished') {
    // Show game over message
    const winner = gameStore.currentGame?.winner
    if (winner) {
      const winnerName = winner === 'A' 
        ? gameStore.players[gameStore.currentGame?.player_a || '']?.nickname || 'Player A'
        : gameStore.players[gameStore.currentGame?.player_b || '']?.nickname || 'Player B'
      
      toast.success(`Game over! ${winnerName} wins!`, { timeout: 5000 })
    } else {
      toast.info('Game ended in a draw', { timeout: 5000 })
    }
  }
}, { immediate: true })

// Methods
const loadGame = async () => {
  try {
    // If we already have the current game loaded, no need to reload
    if (gameStore.currentGame?.id === gameId.value) return
    
    // Check if we're joining an existing game or creating a new one
    if (gameId.value === 'new') {
      await gameStore.createGame()
      toast.info('Game created! Waiting for an opponent...')
    } else {
      await gameStore.joinGame(gameId.value)
      
      if (isPlayer.value) {
        toast.success('Joined the game!')
      } else if (isSpectator.value) {
        toast.info('Spectating the game')
      }
    }
  } catch (error: any) {
    console.error('Error loading game:', error)
    toast.error(error.message || 'Failed to load game')
    router.push({ name: 'home' })
  }
}

const handleCellClick = async (coords: { x: number; y: number }) => {
  if (!gameStore.isPlayerTurn || !selectedCardId.value) return
  
  try {
    await gameStore.makeMove(selectedCardId.value, coords.x, coords.y)
    selectedCardId.value = null
    toast.success('Move made successfully')
  } catch (error: any) {
    console.error('Error making move:', error)
    toast.error(error.message || 'Failed to make move')
  }
}

const selectCard = (cardId: string) => {
  selectedCardId.value = selectedCardId.value === cardId ? null : cardId
}

const handleForfeit = async () => {
  showConfirmForfeit.value = false
  isForfeiting.value = true
  
  try {
    await gameStore.forfeitGame()
    toast.warning('You have forfeited the game')
  } catch (error: any) {
    console.error('Error forfeiting game:', error)
    toast.error(error.message || 'Failed to forfeit game')
  } finally {
    isForfeiting.value = false
  }
}

const handleLeaveGame = async () => {
  showConfirmLeave.value = false
  isLeaving.value = true
  
  try {
    // If the game is in progress and the user is a player, ask for confirmation
    if (gameStore.gameStatus === 'playing' && isPlayer.value) {
      const confirmLeave = window.confirm('Are you sure you want to leave the game? This may count as a forfeit.')
      if (!confirmLeave) {
        isLeaving.value = false
        return
      }
      
      // If confirmed, forfeit the game
      try {
        await gameStore.forfeitGame()
      } catch (error) {
        console.error('Error forfeiting game:', error)
        // Continue leaving even if forfeit fails
      }
    }
    
    // Navigate away
    router.push({ name: 'home' })
  } finally {
    isLeaving.value = false
  }
}

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  // Show confirmation when trying to leave during an active game
  if (gameStore.gameStatus === 'playing' && isPlayer.value) {
    e.preventDefault()
    e.returnValue = 'Are you sure you want to leave? This may count as a forfeit.'
    return e.returnValue
  }
}

const copyGameLink = () => {
  if (!gameStore.currentGame) return
  
  const url = `${window.location.origin}/game/${gameStore.currentGame.id}`
  navigator.clipboard.writeText(url)
    .then(() => {
      toast.success('Game link copied to clipboard!')
    })
    .catch(() => {
      toast.error('Failed to copy game link')
    })
}
</script>

<template>
  <div class="game-page">
    <!-- Loading overlay -->
    <div v-if="gameStore.isLoading" class="loading-overlay">
      <AppLoading size="lg" />
      <p class="mt-4 text-lg font-medium">Loading game...</p>
    </div>
    
    <!-- Game header -->
    <div class="game-header">
      <div class="game-title">
        <h1 class="text-2xl font-bold">Rosenkönig</h1>
        <div v-if="gameStore.currentGame" class="game-id">
          Game ID: {{ gameStore.currentGame.id }}
          <button 
            class="ml-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            @click="copyGameLink"
            title="Copy game link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="game-actions">
        <AppButton 
          variant="outline" 
          size="sm" 
          @click="showConfirmForfeit = true"
          :disabled="!isPlayer || gameStore.gameStatus !== 'playing'"
          :loading="isForfeiting"
        >
          Forfeit
        </AppButton>
        
        <AppButton 
          variant="ghost" 
          size="sm" 
          @click="showConfirmLeave = true"
          :loading="isLeaving"
        >
          Leave Game
        </AppButton>
      </div>
    </div>
    
    <!-- Game status -->
    <div class="game-status">
      <div 
        v-if="gameStore.currentGame"
        class="status-message"
        :class="{
          'text-yellow-600 dark:text-yellow-400': gameStore.gameStatus === 'waiting',
          'text-green-600 dark:text-green-400': gameStore.gameStatus === 'playing',
          'text-rose-600 dark:text-rose-400': gameStore.gameStatus === 'finished'
        }"
      >
        <template v-if="gameStore.gameStatus === 'waiting'">
          <span class="animate-pulse">Waiting for opponent to join...</span>
        </template>
        <template v-else-if="gameStore.gameStatus === 'playing'">
          <template v-if="isPlayer">
            <span v-if="gameStore.isPlayerTurn" class="font-semibold">Your turn!</span>
            <span v-else>Waiting for opponent's move...</span>
          </template>
          <template v-else>
            {{ gameStore.currentPlayer === 'A' ? 'Player A' : 'Player B' }}'s turn
          </template>
        </template>
        <template v-else-if="gameStore.gameStatus === 'finished'">
          <span v-if="gameStore.currentGame.winner">
            <span class="font-semibold">
              {{ gameStore.currentGame.winner === 'A' ? 'Player A' : 'Player B' }} wins!
            </span>
            <span v-if="isPlayer">
              {{ (gameStore.currentGame.winner === 'A' && gameStore.isPlayerA) || 
                 (gameStore.currentGame.winner === 'B' && gameStore.isPlayerB) 
                 ? 'You win!' : 'You lose!' }}
            </span>
          </span>
          <span v-else>
            Game ended in a draw
          </span>
        </template>
      </div>
      
      <div v-if="gameStore.currentGame" class="game-scores">
        <div class="score">
          <span class="player">Player A</span>
          <span class="points">{{ gameStore.currentGame.score_a || 0 }}</span>
        </div>
        <div class="divider">:</div>
        <div class="score">
          <span class="points">{{ gameStore.currentGame.score_b || 0 }}</span>
          <span class="player">Player B</span>
        </div>
      </div>
    </div>
    
    <!-- Game board and cards -->
    <div class="game-layout">
      <!-- Opponent's cards (top) -->
      <div class="opponent-cards" v-if="opponentCards.length > 0">
        <div class="section-title">
          {{ isPlayer ? 'Opponent\'s Cards' : 'Player ' + (gameStore.isPlayerA ? 'B' : 'A') + '\'s Cards' }}
        </div>
        <div class="cards-grid">
          <GameCard 
            v-for="card in opponentCards" 
            :key="card.id" 
            :card="card" 
            :disabled="true"
            size="sm"
          />
        </div>
      </div>
      
      <!-- Game board -->
      <div class="game-board-container">
        <GameBoard 
          :interactive="isPlayer && gameStore.isPlayerTurn && !!selectedCardId"
          @cell-click="handleCellClick"
        />
      </div>
      
      <!-- Current player's cards (bottom) -->
      <div class="player-cards" v-if="currentPlayerCards.length > 0">
        <div class="section-title">
          {{ isPlayer ? 'Your Cards' : 'Player ' + (gameStore.isPlayerA ? 'A' : 'B') + '\'s Cards' }}
        </div>
        <div class="cards-grid">
          <GameCard 
            v-for="card in currentPlayerCards" 
            :key="card.id" 
            :card="card" 
            :is-selected="selectedCardId === card.id"
            :is-playable="gameStore.isPlayerTurn && isPlayer"
            :disabled="!gameStore.isPlayerTurn || !isPlayer"
            @select="selectCard"
          />
        </div>
      </div>
    </div>
    
    <!-- Game log / chat (right sidebar) -->
    <div class="game-sidebar">
      <div class="game-log">
        <h3 class="text-lg font-semibold mb-2">Game Log</h3>
        <div class="log-entries">
          <div v-if="gameStore.moves.length === 0" class="log-entry empty">
            No moves yet
          </div>
          <div 
            v-else
            v-for="(move, index) in [...gameStore.moves].reverse()" 
            :key="index"
            class="log-entry"
            :class="`player-${move.player.toLowerCase()}`"
          >
            <span class="player">Player {{ move.player }}:</span>
            <span class="action">
              {{ move.action }}
              <span v-if="move.x !== null && move.y !== null">
                to ({{ move.x }}, {{ move.y }})
              </span>
            </span>
            <span class="timestamp">
              {{ new Date(move.created_at).toLocaleTimeString() }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="game-chat mt-4">
        <h3 class="text-lg font-semibold mb-2">Chat</h3>
        <div class="chat-messages">
          <div class="empty-message">
            Chat coming soon!
          </div>
        </div>
        <div class="chat-input mt-2">
          <input 
            type="text" 
            class="w-full p-2 border rounded" 
            placeholder="Type a message..."
            disabled
          >
        </div>
      </div>
    </div>
    
    <!-- Confirmation dialogs -->
    <div v-if="showConfirmLeave" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Leave Game</h3>
        <p class="mb-6">
          {{ 
            gameStore.gameStatus === 'playing' && isPlayer 
              ? 'Are you sure you want to leave the game? This may count as a forfeit.' 
              : 'Are you sure you want to leave the game?' 
          }}
        </p>
        <div class="flex justify-end space-x-3">
          <AppButton variant="outline" @click="showConfirmLeave = false">
            Cancel
          </AppButton>
          <AppButton variant="danger" @click="handleLeaveGame">
            Leave
          </AppButton>
        </div>
      </div>
    </div>
    
    <div v-if="showConfirmForfeit" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Forfeit Game</h3>
        <p class="mb-6">
          Are you sure you want to forfeit the game? This will count as a loss.
        </p>
        <div class="flex justify-end space-x-3">
          <AppButton variant="outline" @click="showConfirmForfeit = false">
            Cancel
          </AppButton>
          <AppButton variant="danger" @click="handleForfeit">
            Forfeit
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-page {
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    "header sidebar"
    "status sidebar"
    "main sidebar";
  gap: 1.5rem;
  height: calc(100vh - 4rem);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
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
  z-index: 50;
}

.game-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.game-id {
  font-size: 0.875rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
}

.game-actions {
  display: flex;
  gap: 0.75rem;
}

.game-status {
  grid-area: status;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}

.status-message {
  font-weight: 500;
}

.game-scores {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player {
  font-size: 0.875rem;
  color: #6b7280;
}

.points {
  font-size: 1.25rem;
  min-width: 2rem;
  text-align: center;
}

.divider {
  font-size: 1.5rem;
  font-weight: bold;
  padding: 0 0.5rem;
}

.game-layout {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  padding-right: 1rem;
  margin-right: -1rem;
  padding-bottom: 1rem;
}

.opponent-cards,
.player-cards {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #374151;
  font-size: 0.9375rem;
}

.cards-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.game-board-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 0;
  flex: 1;
}

.game-sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
  padding-left: 1.5rem;
  overflow-y: auto;
}

.game-log,
.game-chat {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.log-entries {
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.875rem;
}

.log-entry {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.empty {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}

.player {
  font-weight: 600;
}

.player-a .player {
  color: #e11d48; /* rose-700 */
}

.player-b .player {
  color: #1d4ed8; /* blue-700 */
}

.timestamp {
  font-size: 0.75rem;
  color: #9ca3af;
}

.chat-messages {
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
}

.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-style: italic;
}

/* Dark mode styles */
.dark .opponent-cards,
.dark .player-cards,
.dark .game-log,
.dark .game-chat {
  background: #1f2937;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .section-title {
  color: #e5e7eb;
}

.dark .log-entries {
  border-color: #374151;
}

.dark .log-entry {
  border-color: #374151;
}

.dark .chat-messages {
  background: #111827;
  border: 1px solid #374151;
}

/* Responsive styles */
@media (max-width: 1024px) {
  .game-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto;
    grid-template-areas:
      "header"
      "status"
      "main"
      "sidebar";
    height: auto;
    overflow-y: auto;
  }
  
  .game-sidebar {
    border-left: none;
    border-top: 1px solid #e5e7eb;
    padding-left: 0;
    padding-top: 1.5rem;
    margin-top: 1rem;
  }
  
  .dark .game-sidebar {
    border-color: #374151;
  }
}

@media (max-width: 640px) {
  .game-page {
    padding: 1rem;
  }
  
  .game-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .game-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .game-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .game-scores {
    width: 100%;
    justify-content: space-between;
  }
  
  .cards-grid {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scrollbar-width: thin;
  }
  
  .cards-grid::-webkit-scrollbar {
    height: 4px;
  }
  
  .cards-grid::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
  
  .dark .cards-grid::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
}
</style>
