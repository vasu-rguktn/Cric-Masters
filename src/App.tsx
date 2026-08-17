import { useState, useEffect } from 'react';
import type { Player } from './types/player';
import type { MatchSession } from './types/match';
import { getStoredPlayers, getCurrentMatch } from './services/storageService';
import { Navigation } from './components/Navigation';
import type { NavTab } from './components/Navigation';
import { Home } from './pages/Home';
import { TodayMatch } from './pages/TodayMatch';
import { PlayersPage } from './pages/PlayersPage';
import { HistoryPage } from './pages/HistoryPage';
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

        {activeTab === 'settings' && (
          <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
        )}
      </main>
    </div>
  );
}

export default App;
