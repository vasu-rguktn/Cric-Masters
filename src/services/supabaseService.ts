import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Player } from '../types/player';
import type { MatchSession } from '../types/match';
import { getAppSettings } from './storageService';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const settings = getAppSettings();
  const url = import.meta.env.VITE_SUPABASE_URL || settings.supabaseUrl;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
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

export async function syncMatchToSupabase(match: MatchSession): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('daily_matches').upsert({
      id: match.id,
      date: match.date,
      available_player_ids: match.availablePlayerIds,
      team_a: match.teamA,
      team_b: match.teamB,
      joker: match.joker,
      is_locked: match.isLocked,
      toss_result: match.tossResult,
      winner_team_id: match.winnerTeamId,
      updated_at: new Date().toISOString(),
    });

    if (error) console.warn('Supabase match sync error:', error);
    return !error;
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
