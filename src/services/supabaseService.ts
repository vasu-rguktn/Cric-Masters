import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Player } from '../types/player';
import type { MatchSession, TossRecord } from '../types/match';
import { getAppSettings, saveMatchToHistory, saveCurrentMatch } from './storageService';

export const SUPABASE_MEDIA_BUCKET = 'cricmasters-media';

export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- CRIC MASTERS - COMPLETE SUPABASE CLOUD DATABASE & STORAGE SETUP
-- =========================================================================
-- Copy and paste this script into your Supabase SQL Editor and click RUN.
-- This creates all required tables, Realtime synchronization, Row Level
-- Security (RLS) policies, and Supabase Storage bucket for Cric Masters.
-- =========================================================================

-- 1. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_regular BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  rating NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. DAILY MATCHES TABLE (Stores matches, teams, toss, and live scorecards)
CREATE TABLE IF NOT EXISTS public.daily_matches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  match_number INTEGER DEFAULT 1 NOT NULL,
  available_player_ids JSONB DEFAULT '[]'::jsonb,
  team_a JSONB,
  team_b JSONB,
  joker JSONB,
  limitations JSONB DEFAULT '[]'::jsonb,
  is_locked BOOLEAN DEFAULT false,
  toss_result TEXT,
  winner_team_id TEXT,
  scorecard JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TOSS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.toss_history (
  id TEXT PRIMARY KEY,
  outcome TEXT NOT NULL,
  caller_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create helpful indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_daily_matches_date ON public.daily_matches (date);
CREATE INDEX IF NOT EXISTS idx_daily_matches_updated ON public.daily_matches (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_active ON public.players (is_active);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toss_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to everyone (so any phone/device can see matches)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Allow public read players') THEN
    CREATE POLICY "Allow public read players" ON public.players FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Allow public insert/update players') THEN
    CREATE POLICY "Allow public insert/update players" ON public.players FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_matches' AND policyname = 'Allow public read matches') THEN
    CREATE POLICY "Allow public read matches" ON public.daily_matches FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_matches' AND policyname = 'Allow public insert/update matches') THEN
    CREATE POLICY "Allow public insert/update matches" ON public.daily_matches FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'toss_history' AND policyname = 'Allow public read toss') THEN
    CREATE POLICY "Allow public read toss" ON public.toss_history FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'toss_history' AND policyname = 'Allow public insert toss') THEN
    CREATE POLICY "Allow public insert toss" ON public.toss_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =========================================================================
-- SUPABASE REALTIME (Enables Instant Multi-Device Live Match & Score Sync)
-- =========================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_matches;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.toss_history;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =========================================================================
-- SUPABASE STORAGE (For Player Photos, Match Summaries & Cards)
-- =========================================================================
-- Create public bucket 'cricmasters-media' if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cricmasters-media',
  'cricmasters-media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policies for public view & upload
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access to cricmasters-media') THEN
    CREATE POLICY "Public Access to cricmasters-media" ON storage.objects
      FOR SELECT USING (bucket_id = 'cricmasters-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow Upload to cricmasters-media') THEN
    CREATE POLICY "Allow Upload to cricmasters-media" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'cricmasters-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow Update cricmasters-media') THEN
    CREATE POLICY "Allow Update cricmasters-media" ON storage.objects
      FOR UPDATE USING (bucket_id = 'cricmasters-media');
  END IF;
END $$;
`;

export const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://ztcnsuddrezydwuzafpb.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Y25zdWRkcmV6eWR3dXphZnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NDk3OTYsImV4cCI6MjEwNzEyNTc5Nn0.YbT06fZCLcshhUlHgHXK99RccA32kMFAek00RQNZnL8',
};

let supabaseClient: SupabaseClient | null = null;
let lastConfigUrl: string | null = null;
let lastConfigKey: string | null = null;

const broadcastChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('cricmasters_match_sync')
    : null;

export function getSupabaseClient(): SupabaseClient | null {
  const settings = getAppSettings();
  const url = (
    import.meta.env.VITE_SUPABASE_URL ||
    settings.supabaseUrl ||
    DEFAULT_SUPABASE_CONFIG.url ||
    ''
  ).trim();
  const key = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    settings.supabaseAnonKey ||
    DEFAULT_SUPABASE_CONFIG.anonKey ||
    ''
  ).trim();

  if (!url || !key) {
    supabaseClient = null;
    return null;
  }

  // Re-create client if credentials changed
  if (supabaseClient && lastConfigUrl === url && lastConfigKey === key) {
    return supabaseClient;
  }

  try {
    supabaseClient = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: false,
      },
    });
    lastConfigUrl = url;
    lastConfigKey = key;
    return supabaseClient;
  } catch (e) {
    console.warn('Supabase initialization failed:', e);
    supabaseClient = null;
    return null;
  }
}

export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tables?: { players: boolean; daily_matches: boolean; toss_history: boolean; storage: boolean };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing. Please enter them in Settings or .env',
    };
  }

  try {
    const results = {
      players: false,
      daily_matches: false,
      toss_history: false,
      storage: false,
    };

    // Test players table
    const { error: pErr } = await client.from('players').select('id').limit(1);
    results.players = !pErr;

    // Test daily_matches table
    const { error: mErr } = await client.from('daily_matches').select('id').limit(1);
    results.daily_matches = !mErr;

    // Test toss_history table
    const { error: tErr } = await client.from('toss_history').select('id').limit(1);
    results.toss_history = !tErr;

    // Test Storage Bucket
    try {
      const { data: buckets } = await client.storage.listBuckets();
      results.storage = !!buckets?.some((b) => b.name === SUPABASE_MEDIA_BUCKET);
    } catch {
      results.storage = false;
    }

    if (results.players && results.daily_matches) {
      return {
        success: true,
        message: 'Successfully connected to Cric Masters Supabase Cloud Database!',
        tables: results,
      };
    } else {
      return {
        success: false,
        message:
          'Connected to Supabase, but tables are not created yet. Please execute the SQL Migration Script in Supabase SQL Editor.',
        tables: results,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err?.message || 'Network error'}`,
    };
  }
}

// ---------------------------------------------------------------------------
// PLAYERS CLOUD SYNC
// ---------------------------------------------------------------------------
export async function fetchAllPlayersFromSupabase(): Promise<Player[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('players')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetch players error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      roles: Array.isArray(row.roles) ? row.roles : [],
      isRegular: Boolean(row.is_regular),
      isActive: Boolean(row.is_active),
      avatarUrl: row.avatar_url || undefined,
      rating: row.rating ? Number(row.rating) : undefined,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Supabase fetch players exception:', e);
    return [];
  }
}

export async function syncPlayersToSupabase(players: Player[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || players.length === 0) return false;

  try {
    const { error } = await client.from('players').upsert(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        roles: p.roles,
        is_regular: p.isRegular,
        is_active: p.isActive,
        avatar_url: p.avatarUrl || null,
        rating: p.rating || null,
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Supabase player sync error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase player sync exception:', e);
    return false;
  }
}

export async function deletePlayerFromSupabase(playerId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('players').delete().eq('id', playerId);
    return !error;
  } catch (e) {
    console.warn('Supabase delete player exception:', e);
    return false;
  }
}

export function subscribeToPlayersUpdates(
  onPlayersReceived: (players: Player[]) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('public:players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        async () => {
          const fresh = await fetchAllPlayersFromSupabase();
          if (fresh.length > 0) {
            onPlayersReceived(fresh);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Failed to subscribe to player updates:', e);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// MATCHES CLOUD SYNC
// ---------------------------------------------------------------------------
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

export async function fetchMatchHistoryFromSupabase(limit: number = 100): Promise<MatchSession[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('daily_matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase fetch match history error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => mapRowToMatchSession(row));
  } catch (e) {
    console.warn('Supabase fetch match history exception:', e);
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
    const { error } = await client.from('daily_matches').upsert(
      {
        id: match.id,
        date: match.date,
        match_number: match.matchNumber || 1,
        available_player_ids: match.availablePlayerIds || [],
        team_a: match.teamA || null,
        team_b: match.teamB || null,
        joker: match.joker || null,
        limitations: match.limitations || [],
        is_locked: Boolean(match.isLocked),
        toss_result: match.tossResult || null,
        winner_team_id: match.winnerTeamId || null,
        scorecard: match.scorecard || null,
        notes: match.notes || null,
        created_at: match.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

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

// ---------------------------------------------------------------------------
// TOSS HISTORY CLOUD SYNC
// ---------------------------------------------------------------------------
export async function syncTossRecordToSupabase(record: TossRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('toss_history').upsert({
      id: record.id,
      outcome: record.outcome,
      caller_id: record.callerId || null,
      timestamp: record.timestamp || new Date().toISOString(),
    });
    return !error;
  } catch (e) {
    console.warn('Supabase toss sync exception:', e);
    return false;
  }
}

export async function fetchTossHistoryFromSupabase(limit: number = 50): Promise<TossRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('toss_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      outcome: r.outcome,
      callerId: r.caller_id || undefined,
      timestamp: r.timestamp || r.created_at,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// REALTIME MATCH SUBSCRIPTIONS
// ---------------------------------------------------------------------------
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
        .channel(`public:daily_matches:date=${date}`)
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

// ---------------------------------------------------------------------------
// SUPABASE STORAGE HELPERS (Player Photos, Match Cards & Media)
// ---------------------------------------------------------------------------
export async function uploadPlayerAvatar(
  playerId: string,
  file: File | Blob,
  extension: string = 'jpg'
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const filePath = `avatars/player_${playerId}_${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage
      .from(SUPABASE_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error:', uploadError);
      return null;
    }

    const { data } = client.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(filePath);
    return data.publicUrl || null;
  } catch (e) {
    console.warn('Storage upload exception:', e);
    return null;
  }
}

export async function uploadMatchImage(
  matchId: string,
  file: File | Blob,
  extension: string = 'png'
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const filePath = `matches/match_${matchId}_${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage
      .from(SUPABASE_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage match image upload error:', uploadError);
      return null;
    }

    const { data } = client.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(filePath);
    return data.publicUrl || null;
  } catch (e) {
    console.warn('Storage match image upload exception:', e);
    return null;
  }
}

export function getStoragePublicUrl(bucket: string, path: string): string | null {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

// ---------------------------------------------------------------------------
// ROW MAPPERS
// ---------------------------------------------------------------------------
function mapRowToMatchSession(row: any): MatchSession {
  return {
    id: row.id,
    date: row.date,
    matchNumber: row.match_number || 1,
    availablePlayerIds: Array.isArray(row.available_player_ids) ? row.available_player_ids : [],
    teamA: row.team_a || null,
    teamB: row.team_b || null,
    joker: row.joker || null,
    limitations: Array.isArray(row.limitations) ? row.limitations : [],
    isLocked: !!row.is_locked,
    tossResult: row.toss_result || null,
    winnerTeamId: row.winner_team_id || null,
    scorecard: row.scorecard || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}
