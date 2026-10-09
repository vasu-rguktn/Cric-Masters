import type { Player } from '../types/player';
import type { MatchSession, TossRecord } from '../types/match';
import type { AppSettings } from '../types/settings';
import { INITIAL_PLAYERS } from '../data/defaultPlayers';

const KEYS = {
  PLAYERS: 'cricmasters_players',
  CURRENT_MATCH: 'cricmasters_current_match',
  MATCH_HISTORY: 'cricmasters_match_history',
  TOSS_HISTORY: 'cricmasters_toss_history',
  YESTERDAY_PLAYERS: 'cricmasters_yesterday_players',
  SETTINGS: 'cricmasters_settings',
};

export const DEFAULT_SETTINGS: AppSettings = {
  maxTossStreak: 2,
  repetitionPenaltyWeight: 5,
  historyWindowSize: 5,
  enableSupabase: true,
  supabaseUrl: 'https://ztcnsuddrezydwuzafpb.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Y25zdWRkcmV6eWR3dXphZnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NDk3OTYsImV4cCI6MjEwNzEyNTc5Nn0.YbT06fZCLcshhUlHgHXK99RccA32kMFAek00RQNZnL8',
};

export function getStoredPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(KEYS.PLAYERS);
    if (!raw) {
      localStorage.setItem(KEYS.PLAYERS, JSON.stringify(INITIAL_PLAYERS));
      return INITIAL_PLAYERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored players:', e);
    return INITIAL_PLAYERS;
  }
}

export function saveStoredPlayers(players: Player[]): void {
  localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
}

export function getCurrentMatch(): MatchSession | null {
  try {
    const raw = localStorage.getItem(KEYS.CURRENT_MATCH);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveCurrentMatch(match: MatchSession): void {
  localStorage.setItem(KEYS.CURRENT_MATCH, JSON.stringify(match));
}

export function clearCurrentMatch(): void {
  localStorage.removeItem(KEYS.CURRENT_MATCH);
}

export function getMatchHistory(): MatchSession[] {
  try {
    const raw = localStorage.getItem(KEYS.MATCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getTodayMatchesByDate(date: string): { match1: MatchSession | null; match2: MatchSession | null } {
  const history = getMatchHistory();
  const current = getCurrentMatch();
  const matchesForDate = history.filter((m) => m.date === date);

  let match1 = matchesForDate.find((m) => m.matchNumber === 1) || null;
  let match2 = matchesForDate.find((m) => m.matchNumber === 2) || null;

  if (!match1 && current && current.date === date && (current.matchNumber === 1 || !current.matchNumber)) {
    match1 = current;
  }
  if (!match2 && current && current.date === date && current.matchNumber === 2) {
    match2 = current;
  }

  // If no match has matchNumber set explicitly, assign the first one found to match1
  if (!match1 && !match2 && matchesForDate.length > 0) {
    match1 = matchesForDate[0];
    if (matchesForDate.length > 1) {
      match2 = matchesForDate[1];
    }
  }

  return { match1, match2 };
}

export function getMatchByDateAndNumber(date: string, matchNumber: 1 | 2): MatchSession | null {
  const { match1, match2 } = getTodayMatchesByDate(date);
  return matchNumber === 1 ? match1 : match2;
}


export function saveMatchToHistory(match: MatchSession): void {
  const history = getMatchHistory();
  const existingIdx = history.findIndex((m) => m.id === match.id);
  if (existingIdx >= 0) {
    history[existingIdx] = match;
  } else {
    history.push(match);
  }
  localStorage.setItem(KEYS.MATCH_HISTORY, JSON.stringify(history));

  if (match.availablePlayerIds && match.availablePlayerIds.length > 0) {
    localStorage.setItem(KEYS.YESTERDAY_PLAYERS, JSON.stringify(match.availablePlayerIds));
  }
}

export function getYesterdayPlayerIds(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.YESTERDAY_PLAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getTossHistory(): TossRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.TOSS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveTossRecord(record: TossRecord): void {
  const history = getTossHistory();
  history.push(record);
  const trimmed = history.slice(-50);
  localStorage.setItem(KEYS.TOSS_HISTORY, JSON.stringify(trimmed));
}

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function exportAllData(): string {
  const data = {
    players: getStoredPlayers(),
    currentMatch: getCurrentMatch(),
    matchHistory: getMatchHistory(),
    tossHistory: getTossHistory(),
    settings: getAppSettings(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.players && Array.isArray(parsed.players)) {
      saveStoredPlayers(parsed.players);
    }
    if (parsed.matchHistory && Array.isArray(parsed.matchHistory)) {
      localStorage.setItem(KEYS.MATCH_HISTORY, JSON.stringify(parsed.matchHistory));
    }
    if (parsed.tossHistory && Array.isArray(parsed.tossHistory)) {
      localStorage.setItem(KEYS.TOSS_HISTORY, JSON.stringify(parsed.tossHistory));
    }
    if (parsed.settings) {
      saveAppSettings(parsed.settings);
    }
    if (parsed.currentMatch) {
      saveCurrentMatch(parsed.currentMatch);
    }
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

export function resetAllData(): void {
  localStorage.removeItem(KEYS.PLAYERS);
  localStorage.removeItem(KEYS.CURRENT_MATCH);
  localStorage.removeItem(KEYS.MATCH_HISTORY);
  localStorage.removeItem(KEYS.TOSS_HISTORY);
  localStorage.removeItem(KEYS.YESTERDAY_PLAYERS);
  localStorage.removeItem(KEYS.SETTINGS);
}
