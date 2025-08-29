import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import type { Database } from '@/types/supabase'

type Game = Database['public']['Tables']['games']['Row']
type Cell = Database['public']['Tables']['cells']['Row']
type Card = Database['public']['Tables']['cards']['Row']
type Move = Database['public']['Tables']['moves']['Row']

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const toast = useToast()
  
  // State
  const currentGame = ref<Game | null>(null)
  const board = ref<Cell[]>([])
  const cards = ref<Card[]>([])
  const moves = ref<Move[]>([])
  const players = ref<{ [key: string]: any }>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const subscription = ref<any>(null)
  
  // Computed properties
  const isPlayerA = computed(() => {
    if (!authStore.userId || !currentGame.value) return false
    return currentGame.value.player_a === authStore.userId
  })
  
  const isPlayerB = computed(() => {
    if (!authStore.userId || !currentGame.value) return false
    return currentGame.value.player_b === authStore.userId
  })
  
  const currentPlayer = computed(() => {
    if (!currentGame.value) return null
    return currentGame.value.turn
  })
  
  const isPlayerTurn = computed(() => {
    if (!authStore.userId || !currentGame.value) return false
    return (
      (isPlayerA.value && currentGame.value.turn === 'A') ||
      (isPlayerB.value && currentGame.value.turn === 'B')
    )
  })
  
  const gameStatus = computed(() => currentGame.value?.status || 'waiting')
  
  // Helper functions
  const getCell = (x: number, y: number) => {
    return board.value.find(cell => cell.x === x && cell.y === y)
  }
  
  const getPlayerCards = (player: 'A' | 'B') => {
    return cards.value.filter(card => card.owner === player && !card.is_used)
  }
  
  // Actions
  const createGame = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const { data, error: createError } = await supabase
        .from('games')
        .insert([{
          player_a: authStore.userId,
          status: 'waiting',
          turn: 'A',
          crown_x: 4,
          crown_y: 4,
        }])
        .select()
        .single()
      
      if (createError) throw createError
      
      currentGame.value = data
      await initializeBoard(data.id)
      await initializeCards(data.id)
      
      // Subscribe to game updates
      await subscribeToGame(data.id)
      
      return data
    } catch (err: any) {
      console.error('Error creating game:', err)
      error.value = err.message || 'Failed to create game'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const joinGame = async (gameId: string) => {
    try {
      if (!authStore.userId) {
        throw new Error('You must be logged in to join a game')
      }
      
      isLoading.value = true
      error.value = null
      
      // Get the current game state
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Check if game is already full
      if (game.player_a && game.player_b) {
        throw new Error('This game is already full')
      }
      
      // Update the game with player B
      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          player_b: authStore.userId,
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      currentGame.value = updatedGame
      
      // Load game data
      await Promise.all([
        fetchBoard(gameId),
        fetchCards(gameId),
        fetchMoves(gameId),
        fetchPlayers(gameId)
      ])
      
      // Subscribe to game updates
      await subscribeToGame(gameId)
      
      return updatedGame
    } catch (err: any) {
      console.error('Error joining game:', err)
      error.value = err.message || 'Failed to join game'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const makeMove = async (cardId: string, toX: number, toY: number) => {
    try {
      if (!currentGame.value || !isPlayerTurn.value) {
        throw new Error('It\'s not your turn')
      }
      
      isLoading.value = true
      error.value = null
      
      // Call the edge function to make a move
      const { data, error: moveError } = await supabase.functions.invoke('play-turn', {
        body: {
          gameId: currentGame.value.id,
          cardId,
          toX,
          toY
        }
      })
      
      if (moveError) throw moveError
      
      // The real-time subscription will update the game state
      return data
    } catch (err: any) {
      console.error('Error making move:', err)
      error.value = err.message || 'Failed to make move'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const forfeitGame = async () => {
    try {
      if (!currentGame.value || !authStore.userId) {
        throw new Error('No active game or user not authenticated')
      }
      
      const winner = isPlayerA.value ? 'B' : 'A'
      
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status: 'finished',
          winner,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGame.value.id)
      
      if (updateError) throw updateError
      
      // The real-time subscription will update the game state
      toast.info('You have forfeited the game')
    } catch (err: any) {
      console.error('Error forfeiting game:', err)
      error.value = err.message || 'Failed to forfeit game'
      toast.error(error.value)
      throw err
    }
  }
  
  // Helper methods
  const initializeBoard = async (gameId: string) => {
    const cells = []
    
    // Create 9x9 grid
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        cells.push({
          game_id: gameId,
          x,
          y,
          owner: 'none' as const
        })
      }
    }
    
    // Set the center cell to be owned by the crown
    const centerCell = cells.find(cell => cell.x === 4 && cell.y === 4)
    if (centerCell) {
      centerCell.owner = 'A' // First player starts with the center
    }
    
    // Insert the initial board state
    const { error } = await supabase
      .from('cells')
      .insert(cells)
    
    if (error) throw error
    
    // Update local state
    board.value = cells
  }
  
  const initializeCards = async (gameId: string) => {
    const cardsToCreate = [
      // Influence cards (simple moves)
      { kind: 'influence', dx: 1, dy: 0, steps: 1 },
      { kind: 'influence', dx: -1, dy: 0, steps: 1 },
      { kind: 'influence', dx: 0, dy: 1, steps: 1 },
      { kind: 'influence', dx: 0, dy: -1, steps: 1 },
      
      // Hero cards (special moves)
      { kind: 'hero', dx: 2, dy: 0, steps: 1 },
      { kind: 'hero', dx: -2, dy: 0, steps: 1 },
      { kind: 'hero', dx: 0, dy: 2, steps: 1 },
      { kind: 'hero', dx: 0, dy: -2, steps: 1 },
      { kind: 'hero', dx: 1, dy: 1, steps: 1 },
      { kind: 'hero', dx: -1, dy: -1, steps: 1 },
    ]
    
    // Duplicate cards for both players
    const allCards = []
    
    // Player A's cards
    cardsToCreate.forEach((card, index) => {
      allCards.push({
        game_id: gameId,
        owner: 'A',
        ...card,
        is_used: false,
        order_in_deck: index
      })
    })
    
    // Player B's cards (same as player A's)
    cardsToCreate.forEach((card, index) => {
      allCards.push({
        game_id: gameId,
        owner: 'B',
        ...card,
        is_used: false,
        order_in_deck: index
      })
    })
    
    // Insert cards into the database
    const { data, error } = await supabase
      .from('cards')
      .insert(allCards)
      .select()
    
    if (error) throw error
    
    // Update local state
    cards.value = data
  }
  
  const fetchBoard = async (gameId: string) => {
    const { data, error } = await supabase
      .from('cells')
      .select('*')
      .eq('game_id', gameId)
    
    if (error) throw error
    
    board.value = data
  }
  
  const fetchCards = async (gameId: string) => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('game_id', gameId)
      .order('order_in_deck', { ascending: true })
    
    if (error) throw error
    
    cards.value = data
  }
  
  const fetchMoves = async (gameId: string) => {
    const { data, error } = await supabase
      .from('moves')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    moves.value = data
  }
  
  const fetchPlayers = async (gameId: string) => {
    if (!currentGame.value) return
    
    const playerIds = [
      currentGame.value.player_a,
      currentGame.value.player_b
    ].filter(Boolean) as string[]
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', playerIds)
    
    if (error) throw error
    
    // Create a map of player IDs to their data
    const playerMap: { [key: string]: any } = {}
    data.forEach(player => {
      playerMap[player.id] = player
    })
    
    players.value = playerMap
  }
  
  const subscribeToGame = async (gameId: string) => {
    // Unsubscribe from any existing subscription
    if (subscription.value) {
      await supabase.removeChannel(subscription.value)
    }
    
    // Subscribe to game updates
    subscription.value = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `id=eq.${gameId}`
        }, 
        (payload) => {
          console.log('Game updated:', payload)
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            currentGame.value = payload.new as Game
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cells',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('Cell updated:', payload)
          await fetchBoard(gameId)
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('Card updated:', payload)
          await fetchCards(gameId)
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moves',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log('New move:', payload)
          await fetchMoves(gameId)
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })
  }
  
  const resetGame = () => {
    if (subscription.value) {
      supabase.removeChannel(subscription.value)
      subscription.value = null
    }
    
    currentGame.value = null
    board.value = []
    cards.value = []
    moves.value = []
    players.value = {}
    error.value = null
  }
  
  return {
    // State
    currentGame,
    board,
    cards,
    moves,
    players,
    isLoading,
    error,
    
    // Computed
    isPlayerA,
    isPlayerB,
    currentPlayer,
    isPlayerTurn,
    gameStatus,
    
    // Actions
    createGame,
    joinGame,
    makeMove,
    forfeitGame,
    resetGame,
    
    // Helper methods
    getCell,
    getPlayerCards,
  }
})
