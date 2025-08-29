import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import type { Database } from '@/types/supabase'

type LeaderboardEntry = Database['public']['Functions']['get_leaderboard']['Returns'][0]
type UserStats = Database['public']['Functions']['get_user_stats']['Returns'][0]

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const authStore = useAuthStore()
  const toast = useToast()
  
  // State
  const leaderboard = ref<LeaderboardEntry[]>([])
  const userStats = ref<UserStats | null>(null)
  const currentSeason = ref<string>('S1') // Default season
  const seasons = ref<{id: string, name: string}[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed properties
  const topPlayers = computed(() => leaderboard.value.slice(0, 10))
  const userRank = computed(() => userStats.value?.rank || 0)
  const totalPlayers = computed(() => leaderboard.value.length)
  
  // Actions
  const fetchSeasons = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const { data, error: fetchError } = await supabase
        .from('seasons')
        .select('id, name')
        .order('starts_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      seasons.value = data
      
      // Set current season to the most recent active season
      const activeSeason = data.find(season => season.is_active)
      if (activeSeason) {
        currentSeason.value = activeSeason.id
      }
      
      return data
    } catch (err: any) {
      console.error('Error fetching seasons:', err)
      error.value = err.message || 'Failed to load seasons'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchLeaderboard = async (seasonId: string = currentSeason.value) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Call the database function to get the leaderboard
      const { data, error: leaderboardError } = await supabase
        .rpc('get_leaderboard', {
          p_season_id: seasonId,
          p_limit: 100, // Top 100 players
          p_offset: 0
        })
      
      if (leaderboardError) throw leaderboardError
      
      leaderboard.value = data || []
      
      // If user is logged in, fetch their stats
      if (authStore.isAuthenticated) {
        await fetchUserStats(seasonId)
      }
      
      return data
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err)
      error.value = err.message || 'Failed to load leaderboard'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchUserStats = async (seasonId: string = currentSeason.value) => {
    try {
      if (!authStore.userId) return null
      
      isLoading.value = true
      error.value = null
      
      // Call the database function to get user stats
      const { data, error: statsError } = await supabase
        .rpc('get_user_stats', {
          p_user_id: authStore.userId,
          p_season_id: seasonId
        })
      
      if (statsError) throw statsError
      
      userStats.value = data?.[0] || null
      
      return userStats.value
    } catch (err: any) {
      console.error('Error fetching user stats:', err)
      error.value = err.message || 'Failed to load user stats'
      // Don't show error toast here to avoid spamming the user
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchMatchHistory = async (userId: string, limit: number = 10) => {
    try {
      isLoading.value = true
      error.value = null
      
      const { data, error: historyError } = await supabase
        .from('match_history')
        .select(`
          *,
          winner:winner_user_id(profiles!match_history_winner_user_id_fkey(id, nickname)),
          loser:loser_user_id(profiles!match_history_loser_user_id_fkey(id, nickname))
        `)
        .or(`winner_user_id.eq.${userId},loser_user_id.eq.${userId}`)
        .order('finished_at', { ascending: false })
        .limit(limit)
      
      if (historyError) throw historyError
      
      return data.map(match => ({
        ...match,
        isWinner: match.winner_user_id === userId,
        opponent: match.winner_user_id === userId 
          ? match.loser 
          : match.winner,
        score: match.winner_user_id === userId
          ? `${match.score_winner}-${match.score_loser}`
          : `${match.score_loser}-${match.score_winner}`,
        result: match.winner_user_id === userId ? 'win' : 'loss'
      }))
    } catch (err: any) {
      console.error('Error fetching match history:', err)
      error.value = err.message || 'Failed to load match history'
      toast.error(error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const setCurrentSeason = (seasonId: string) => {
    currentSeason.value = seasonId
  }
  
  return {
    // State
    leaderboard,
    userStats,
    currentSeason,
    seasons,
    isLoading,
    error,
    
    // Computed
    topPlayers,
    userRank,
    totalPlayers,
    
    // Actions
    fetchSeasons,
    fetchLeaderboard,
    fetchUserStats,
    fetchMatchHistory,
    setCurrentSeason
  }
})
