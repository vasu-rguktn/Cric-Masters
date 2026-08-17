export interface AppSettings {
  maxTossStreak: number; // Default 2
  repetitionPenaltyWeight: number; // 0 to 10 scale
  historyWindowSize: number; // Default 5 matches
  enableSupabase: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}
