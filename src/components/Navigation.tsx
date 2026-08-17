import React from 'react';
import { Home, Calendar, Users, History, Settings, Sun, Moon } from 'lucide-react';

export type NavTab = 'home' | 'today' | 'players' | 'history' | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  availableCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  availableCount,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-stadium-900/90 backdrop-blur-md border-b border-stadium-700/50 px-4 py-2.5 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <img
              src="./cric.png"
              alt="Cric Masters Logo"
              className="w-10 h-10 object-contain drop-shadow-md rounded-lg"
            />
            <div>
              <h1 className="font-black text-lg text-white tracking-wider leading-none">
                CRIC MASTERS
              </h1>
              <p className="text-[10px] text-turf-400 uppercase font-extrabold tracking-widest mt-0.5">
                Faculty Cricket Club
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode for sunlight' : 'Switch to Dark Mode'}
                className="p-2 rounded-full bg-stadium-800 hover:bg-stadium-700 border border-stadium-700 text-gold-400 transition-all shadow-sm"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-gold-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            )}

            <div
              onClick={() => setActiveTab('today')}
              className="cursor-pointer bg-stadium-800 hover:bg-stadium-700 border border-turf-500/40 rounded-full px-3 py-1.5 flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-turf-400 animate-pulse"></span>
              <span className="text-xs font-black text-white">
                {availableCount} Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stadium-950/95 backdrop-blur-xl border-t border-stadium-800/80 px-2 py-1 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'home'
                ? 'text-turf-400 font-black bg-turf-500/10 scale-105'
                : 'text-stadium-400 hover:text-stadium-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'today'
                ? 'text-turf-400 font-black bg-turf-500/10 scale-105'
                : 'text-stadium-400 hover:text-stadium-200'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Today</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'players'
                ? 'text-turf-400 font-black bg-turf-500/10 scale-105'
                : 'text-stadium-400 hover:text-stadium-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Players</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'text-turf-400 font-black bg-turf-500/10 scale-105'
                : 'text-stadium-400 hover:text-stadium-200'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'text-turf-400 font-black bg-turf-500/10 scale-105'
                : 'text-stadium-400 hover:text-stadium-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};
