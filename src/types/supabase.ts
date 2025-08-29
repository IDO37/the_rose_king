export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          nickname?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          nickname?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      games: {
        Row: {
          id: string
          status: 'waiting' | 'playing' | 'finished'
          season_id: string
          player_a: string | null
          player_b: string | null
          turn: 'A' | 'B' | 'none'
          crown_x: number
          crown_y: number
          score_a: number | null
          score_b: number | null
          winner: 'A' | 'B' | null
          created_at: string
          updated_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          status?: 'waiting' | 'playing' | 'finished'
          season_id?: string
          player_a?: string | null
          player_b?: string | null
          turn?: 'A' | 'B' | 'none'
          crown_x?: number
          crown_y?: number
          score_a?: number | null
          score_b?: number | null
          winner?: 'A' | 'B' | null
          created_at?: string
          updated_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          status?: 'waiting' | 'playing' | 'finished'
          season_id?: string
          player_a?: string | null
          player_b?: string | null
          turn?: 'A' | 'B' | 'none'
          crown_x?: number
          crown_y?: number
          score_a?: number | null
          score_b?: number | null
          winner?: 'A' | 'B' | null
          created_at?: string
          updated_at?: string | null
          finished_at?: string | null
        }
      }
      cells: {
        Row: {
          game_id: string
          x: number
          y: number
          owner: 'none' | 'A' | 'B'
        }
        Insert: {
          game_id: string
          x: number
          y: number
          owner?: 'none' | 'A' | 'B'
        }
        Update: {
          game_id?: string
          x?: number
          y?: number
          owner?: 'none' | 'A' | 'B'
        }
      }
      cards: {
        Row: {
          id: string
          game_id: string
          owner: 'A' | 'B' | null
          kind: 'influence' | 'hero'
          dx: number | null
          dy: number | null
          steps: number | null
          is_used: boolean
          order_in_deck: number | null
        }
        Insert: {
          id?: string
          game_id: string
          owner?: 'A' | 'B' | null
          kind: 'influence' | 'hero'
          dx?: number | null
          dy?: number | null
          steps?: number | null
          is_used?: boolean
          order_in_deck?: number | null
        }
        Update: {
          id?: string
          game_id?: string
          owner?: 'A' | 'B' | null
          kind?: 'influence' | 'hero'
          dx?: number | null
          dy?: number | null
          steps?: number | null
          is_used?: boolean
          order_in_deck?: number | null
        }
      }
      moves: {
        Row: {
          id: number
          game_id: string
          actor: 'A' | 'B'
          used_card: string | null
          from_x: number | null
          from_y: number | null
          to_x: number
          to_y: number
          flipped: boolean
          created_at: string
        }
        Insert: {
          id?: number
          game_id: string
          actor: 'A' | 'B'
          used_card?: string | null
          from_x?: number | null
          from_y?: number | null
          to_x: number
          to_y: number
          flipped?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          game_id?: string
          actor?: 'A' | 'B'
          used_card?: string | null
          from_x?: number | null
          from_y?: number | null
          to_x?: number
          to_y?: number
          flipped?: boolean
          created_at?: string
        }
      }
      seasons: {
        Row: {
          id: string
          name: string
          starts_at: string
          ends_at: string
          is_active: boolean
        }
        Insert: {
          id: string
          name: string
          starts_at: string
          ends_at: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          starts_at?: string
          ends_at?: string
          is_active?: boolean
        }
      }
      leaderboard: {
        Row: {
          id: number
          season_id: string
          user_id: string
          games_played: number
          wins: number
          losses: number
          draws: number
          best_score: number
          elo: number
          last_played: string | null
        }
        Insert: {
          id?: number
          season_id: string
          user_id: string
          games_played?: number
          wins?: number
          losses?: number
          draws?: number
          best_score?: number
          elo?: number
          last_played?: string | null
        }
        Update: {
          id?: number
          season_id?: string
          user_id?: string
          games_played?: number
          wins?: number
          losses?: number
          draws?: number
          best_score?: number
          elo?: number
          last_played?: string | null
        }
      }
      match_history: {
        Row: {
          id: number
          game_id: string
          season_id: string
          winner_user_id: string | null
          loser_user_id: string | null
          score_winner: number | null
          score_loser: number | null
          finished_at: string
        }
        Insert: {
          id?: number
          game_id: string
          season_id: string
          winner_user_id?: string | null
          loser_user_id?: string | null
          score_winner?: number | null
          score_loser?: number | null
          finished_at?: string
        }
        Update: {
          id?: number
          game_id?: string
          season_id?: string
          winner_user_id?: string | null
          loser_user_id?: string | null
          score_winner?: number | null
          score_loser?: number | null
          finished_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_elo: {
        Args: {
          winner_elo: number
          loser_elo: number
          k_factor?: number
        }
        Returns: {
          new_winner_elo: number
          new_loser_elo: number
        }[]
      }
      get_leaderboard: {
        Args: {
          p_season_id: string
          p_limit: number
          p_offset: number
        }
        Returns: {
          rank: number
          user_id: string
          nickname: string
          elo: number
          wins: number
          losses: number
          draws: number
          best_score: number
          last_played: string
        }[]
      }
      get_user_stats: {
        Args: {
          p_user_id: string
          p_season_id: string
        }
        Returns: {
          rank: number
          games_played: number
          wins: number
          losses: number
          draws: number
          win_rate: number
          best_score: number
          elo: number
          last_played: string
        }[]
      }
    }
    Enums: {
      game_status: 'waiting' | 'playing' | 'finished'
      cell_owner: 'none' | 'A' | 'B'
      card_type: 'influence' | 'hero'
    }
  }
}
