import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Player } from '../types/player';
import type { MatchSession } from '../types/match';
import { getAppSettings, saveMatchToHistory, saveCurrentMatch } from './storageService';

let supabaseClient: SupabaseClient | null = null;
const broadcastChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('cricmasters_match_sync')
    : null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const settings = getAppSettings();
  const url = import.meta.env.VITE_SUPABASE_URL || settings.supabaseUrl;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

  if (url && key) {
    try {
      supabaseClient = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return supabaseClient;
    } catch (e) {
      console.warn('Supabase initialization failed:', e);
      return null;
    }
  }

  return null;
}

export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}

export async function fetchTodayMatchesFromSupabase(date: string): Promise<MatchSession[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('daily_matches')
      .select('*')
      .eq('date', date)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch matches error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => mapRowToMatchSession(row));
  } catch (e) {
    console.warn('Supabase fetch matches exception:', e);
    return [];
  }
}

export async function syncMatchToSupabase(match: MatchSession): Promise<boolean> {
  // Broadcast locally to any open browser tabs/windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'MATCH_UPDATED', match });
    } catch (e) {
      // ignore
    }
  }

  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('daily_matches').upsert({
      id: match.id,
      date: match.date,
      match_number: match.matchNumber || 1,
      available_player_ids: match.availablePlayerIds,
      team_a: match.teamA,
      team_b: match.teamB,
      joker: match.joker,
      is_locked: match.isLocked,
      toss_result: match.tossResult,
      winner_team_id: match.winnerTeamId,
      scorecard: match.scorecard || null,
      notes: match.notes || null,
      created_at: match.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase match sync error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase match sync exception:', e);
    return false;
  }
}

export async function syncPlayersToSupabase(players: Player[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('players').upsert(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        roles: p.roles,
        is_regular: p.isRegular,
        is_active: p.isActive,
        created_at: p.createdAt,
      }))
    );

    if (error) console.warn('Supabase player sync error:', error);
    return !error;
  } catch (e) {
    console.warn('Supabase player sync exception:', e);
    return false;
  }
}

export function subscribeToMatchUpdates(
  date: string,
  onMatchReceived: (match: MatchSession) => void
): () => void {
  // 1. Listen to local broadcast channel
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'MATCH_UPDATED' && event.data.match) {
      const match = event.data.match as MatchSession;
      if (match.date === date) {
        onMatchReceived(match);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Listen to storage events (cross-window/tab sync on same origin)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'cricmasters_current_match' && event.newValue) {
      try {
        const match = JSON.parse(event.newValue) as MatchSession;
        if (match && match.date === date) {
          onMatchReceived(match);
        }
      } catch (e) {
        // ignore
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // 3. Supabase Realtime Subscription
  const client = getSupabaseClient();
  let supabaseSubscription: any = null;

  if (client) {
    try {
      supabaseSubscription = client
        .channel(`public:daily_matches:date=eq.${date}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_matches',
            filter: `date=eq.${date}`,
          },
          (payload: any) => {
            if (payload.new) {
              const updatedMatch = mapRowToMatchSession(payload.new);
              saveCurrentMatch(updatedMatch);
              saveMatchToHistory(updatedMatch);
              onMatchReceived(updatedMatch);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Failed to subscribe to realtime match updates:', e);
    }
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    if (supabaseSubscription && client) {
      client.removeChannel(supabaseSubscription);
    }
  };
}

function mapRowToMatchSession(row: any): MatchSession {
  return {
    id: row.id,
    date: row.date,
    matchNumber: row.match_number || 1,
    availablePlayerIds: row.available_player_ids || [],
    teamA: row.team_a || null,
    teamB: row.team_b || null,
    joker: row.joker || null,
    limitations: row.limitations || [],
    isLocked: !!row.is_locked,
    tossResult: row.toss_result || null,
    winnerTeamId: row.winner_team_id || null,
    scorecard: row.scorecard || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}
