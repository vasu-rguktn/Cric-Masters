import { useState, useEffect, useCallback } from 'react';
import type { Player } from './types/player';
import type { MatchSession } from './types/match';
import {
  getStoredPlayers,
  saveStoredPlayers,
  getCurrentMatch,
  getTodayMatch,
  saveCurrentMatch,
  saveMatchToHistory,
  clearCurrentMatch,
} from './services/storageService';
import {
  fetchAllPlayersFromSupabase,
  fetchLatestTodayMatchFromSupabase,
  subscribeToPlayersUpdates,
  subscribeToMatchUpdates,
  isSupabaseAvailable,
} from './services/supabaseService';
import { decodeMatchFromUrl } from './utils/sharing';
import { Navigation } from './components/Navigation';
import type { NavTab } from './components/Navigation';
import { Home } from './pages/Home';
import { TodayMatch } from './pages/TodayMatch';
import { PlayersPage } from './pages/PlayersPage';
import { HistoryPage } from './pages/HistoryPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { getTodayIsoDate } from './utils/dates';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cricmasters_theme') as 'dark' | 'light') || 'dark';
  });

  const [players, setPlayers] = useState<Player[]>(() => getStoredPlayers());
  // Load current match with auto-expiration (if from yesterday/earlier, archives & returns null)
  const [currentMatch, setCurrentMatch] = useState<MatchSession | null>(() => getCurrentMatch(true));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    if (currentMatch?.availablePlayerIds && currentMatch.availablePlayerIds.length > 0) {
      return currentMatch.availablePlayerIds;
    }
    return players.filter((p) => p.isActive && p.isRegular).map((p) => p.id);
  });

  // Master sync function to pull latest players and today's match from Supabase
  const syncCloudData = useCallback(async (silent: boolean = false): Promise<boolean> => {
    if (!silent) setIsRefreshing(true);
    const todayStr = getTodayIsoDate();

    let success = false;
    try {
      if (isSupabaseAvailable()) {
        const [cloudPlayers, cloudMatch] = await Promise.all([
          fetchAllPlayersFromSupabase(),
          fetchLatestTodayMatchFromSupabase(todayStr),
        ]);

        if (cloudPlayers && cloudPlayers.length > 0) {
          setPlayers(cloudPlayers);
          saveStoredPlayers(cloudPlayers);
        }

        if (cloudMatch) {
          setCurrentMatch(cloudMatch);
          saveCurrentMatch(cloudMatch);
          saveMatchToHistory(cloudMatch);
          if (cloudMatch.availablePlayerIds && cloudMatch.availablePlayerIds.length > 0) {
            setSelectedPlayerIds(cloudMatch.availablePlayerIds);
          }
          success = true;
        } else {
          // If no cloud match exists for today, ensure currentMatch belongs to today
          const local = getCurrentMatch(true);
          if (local && local.date === todayStr) {
            setCurrentMatch(local);
          } else {
            setCurrentMatch(null);
          }
          success = true;
        }
      }
    } catch (e) {
      console.warn('Sync cloud error:', e);
    } finally {
      setLastSyncedTime(new Date());
      if (!silent) setIsRefreshing(false);
    }
    return success;
  }, []);

  // Sync on mount and subscribe to Realtime updates
  useEffect(() => {
    let isMounted = true;
    const todayStr = getTodayIsoDate();

    syncCloudData(true);

    const unsubPlayers = subscribeToPlayersUpdates((cloudPlayers) => {
      if (isMounted && cloudPlayers && cloudPlayers.length > 0) {
        setPlayers(cloudPlayers);
        saveStoredPlayers(cloudPlayers);
      }
    });

    const unsubMatches = subscribeToMatchUpdates(todayStr, (updatedMatch: MatchSession) => {
      if (isMounted) {
        if (!updatedMatch) {
          clearCurrentMatch();
          setCurrentMatch(null);
          return;
        }
        if (updatedMatch.date === getTodayIsoDate()) {
          saveCurrentMatch(updatedMatch);
          saveMatchToHistory(updatedMatch);
          setCurrentMatch(updatedMatch);
          if (updatedMatch.availablePlayerIds && updatedMatch.availablePlayerIds.length > 0) {
            setSelectedPlayerIds(updatedMatch.availablePlayerIds);
          }
          setLastSyncedTime(new Date());
        }
      }
    });

    return () => {
      isMounted = false;
      unsubPlayers();
      unsubMatches();
    };
  }, [syncCloudData]);

  // Tab Visibility & Focus Watcher: Re-sync instantly when phone is unlocked or user returns to tab
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncCloudData(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [syncCloudData]);

  // Midnight Rollover Watcher (11:59PM -> 00:00AM): Automatically vanish past match and reset for new day
  useEffect(() => {
    let lastCheckedDate = getTodayIsoDate();

    const checkMidnight = () => {
      const currentDate = getTodayIsoDate();
      if (currentDate !== lastCheckedDate) {
        console.log(`[Cric Masters] Date rolled over to ${currentDate}. Resetting match for new day.`);
        lastCheckedDate = currentDate;

        // Archive previous match into history & clear current active match
        const oldMatch = getCurrentMatch(false);
        if (oldMatch) {
          saveMatchToHistory(oldMatch);
          clearCurrentMatch();
        }
        setCurrentMatch(null);

        // Reset selected players to regular active pool
        const regularIds = players.filter((p) => p.isActive && p.isRegular).map((p) => p.id);
        setSelectedPlayerIds(regularIds);

        // Re-sync with cloud for the new date
        syncCloudData(true);
      }
    };

    const interval = setInterval(checkMidnight, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [players, syncCloudData]);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('cricmasters_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // URL sharing check (supports both legacy base64 ?m= and clean short ?d=)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedParam = searchParams.get('m') || searchParams.get('match');
      const dateParam = searchParams.get('d') || searchParams.get('date');

      if (sharedParam && sharedParam.length > 20) {
        const decodedMatch = decodeMatchFromUrl(sharedParam);
        if (decodedMatch) {
          setCurrentMatch(decodedMatch);
          saveCurrentMatch(decodedMatch);
          saveMatchToHistory(decodedMatch);
          if (decodedMatch.availablePlayerIds && decodedMatch.availablePlayerIds.length > 0) {
            setSelectedPlayerIds(decodedMatch.availablePlayerIds);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }

      if (dateParam) {
        const found = getTodayMatch(dateParam);
        if (found) {
          setCurrentMatch(found);
          if (found.availablePlayerIds && found.availablePlayerIds.length > 0) {
            setSelectedPlayerIds(found.availablePlayerIds);
          }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleMakeTeamsFromHome = () => {
    setActiveTab('today');
  };

  return (
    <div className="min-h-screen bg-stadium-950 text-stadium-100 font-sans selection:bg-turf-500 selection:text-stadium-950 transition-colors duration-300">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        availableCount={selectedPlayerIds.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="transition-all duration-300">
        {activeTab === 'home' && (
          <Home
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            currentMatch={currentMatch}
            onNavigate={setActiveTab}
            onMakeTeamsClick={handleMakeTeamsFromHome}
            onRefresh={() => syncCloudData(false)}
            isRefreshing={isRefreshing}
            lastSyncedTime={lastSyncedTime}
          />
        )}

        {activeTab === 'today' && (
          <TodayMatch
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            setSelectedPlayerIds={setSelectedPlayerIds}
            currentMatch={currentMatch}
            setCurrentMatch={setCurrentMatch}
            onRefresh={() => syncCloudData(false)}
            isRefreshing={isRefreshing}
            lastSyncedTime={lastSyncedTime}
          />
        )}

        {activeTab === 'players' && (
          <PlayersPage players={players} setPlayers={setPlayers} />
        )}

        {activeTab === 'history' && <HistoryPage />}

        {activeTab === 'score' && (
          <ScoreboardPage
            currentMatch={currentMatch}
            setCurrentMatch={setCurrentMatch}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
        )}
      </main>

      <footer className="pb-24 pt-8 text-center text-stadium-500/70 text-[10px] font-mono tracking-widest uppercase">
        Created by author - vasuneninthe
      </footer>
    </div>
  );
}

export default App;
