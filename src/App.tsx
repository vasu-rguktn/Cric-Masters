import { useState, useEffect } from 'react';
import type { Player } from './types/player';
import type { MatchSession } from './types/match';
import {
  getStoredPlayers,
  saveStoredPlayers,
  getCurrentMatch,
  saveCurrentMatch,
  saveMatchToHistory,
} from './services/storageService';
import {
  fetchAllPlayersFromSupabase,
  fetchTodayMatchesFromSupabase,
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
  const [currentMatch, setCurrentMatch] = useState<MatchSession | null>(() => getCurrentMatch());

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    if (currentMatch?.availablePlayerIds && currentMatch.availablePlayerIds.length > 0) {
      return currentMatch.availablePlayerIds;
    }
    return players.filter((p) => p.isActive && p.isRegular).map((p) => p.id);
  });

  // Sync players and matches from Supabase on startup and subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    const todayStr = getTodayIsoDate();

    async function syncCloudData() {
      if (isSupabaseAvailable()) {
        try {
          const [cloudPlayers, cloudMatches] = await Promise.all([
            fetchAllPlayersFromSupabase(),
            fetchTodayMatchesFromSupabase(todayStr),
          ]);

          if (isMounted && cloudPlayers && cloudPlayers.length > 0) {
            setPlayers(cloudPlayers);
            saveStoredPlayers(cloudPlayers);
          }

          if (isMounted && cloudMatches && cloudMatches.length > 0) {
            const m1 =
              cloudMatches.find(
                (m: MatchSession) => m.matchNumber === 1 || !m.matchNumber
              ) || cloudMatches[0];
            if (m1) {
              setCurrentMatch(m1);
              saveCurrentMatch(m1);
              saveMatchToHistory(m1);
              if (m1.availablePlayerIds && m1.availablePlayerIds.length > 0) {
                setSelectedPlayerIds(m1.availablePlayerIds);
              }
            }
          }
        } catch (e) {
          // fallback to stored
        }
      }
    }

    syncCloudData();

    const unsubPlayers = subscribeToPlayersUpdates((cloudPlayers) => {
      if (isMounted && cloudPlayers && cloudPlayers.length > 0) {
        setPlayers(cloudPlayers);
        saveStoredPlayers(cloudPlayers);
      }
    });

    const unsubMatches = subscribeToMatchUpdates(todayStr, (updatedMatch: MatchSession) => {
      if (isMounted && updatedMatch) {
        saveCurrentMatch(updatedMatch);
        saveMatchToHistory(updatedMatch);
        setCurrentMatch(updatedMatch);
        if (updatedMatch.availablePlayerIds && updatedMatch.availablePlayerIds.length > 0) {
          setSelectedPlayerIds(updatedMatch.availablePlayerIds);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubPlayers();
      unsubMatches();
    };
  }, []);

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

  useEffect(() => {
    // 1. Check for URL shared match parameter (e.g. ?m=... or ?match=...)
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedParam = searchParams.get('m') || searchParams.get('match');
      if (sharedParam) {
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
    }

    if (!currentMatch) {
      const todayStr = getTodayIsoDate();
      const initialMatch: MatchSession = {
        id: 'match-' + Date.now(),
        date: todayStr,
        availablePlayerIds: selectedPlayerIds,
        teamA: null,
        teamB: null,
        joker: null,
        limitations: [],
        isLocked: false,
        tossResult: null,
        winnerTeamId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentMatch(initialMatch);
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
          />
        )}

        {activeTab === 'today' && (
          <TodayMatch
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            setSelectedPlayerIds={setSelectedPlayerIds}
            currentMatch={currentMatch}
            setCurrentMatch={setCurrentMatch}
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
