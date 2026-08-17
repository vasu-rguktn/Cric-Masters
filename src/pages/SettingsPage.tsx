import React, { useState } from 'react';
import type { AppSettings } from '../types/settings';
import { getAppSettings, saveAppSettings, exportAllData, importAllData, resetAllData } from '../services/storageService';
import { isSupabaseAvailable } from '../services/supabaseService';
import { Settings, Download, Upload, Trash2, Database, CheckCircle2, Lock, UserCheck, LogOut, ShieldAlert, Sun, Moon } from 'lucide-react';

const AUTH_KEY = 'cricmasters_auth_vasu';

interface SettingsPageProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme = 'dark', onToggleTheme }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>(settings.supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>(settings.supabaseAnonKey || '');
  const [importInput, setImportInput] = useState<string>('');
  const [showImportArea, setShowImportArea] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().toLowerCase() === 'vasu' && passwordInput === 'vasu') {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setLoginError(null);
    } else {
      setLoginError('Invalid username or password. Access restricted to vasu.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleSaveSettings = () => {
    const updated: AppSettings = {
      ...settings,
      supabaseUrl: supabaseUrlInput.trim() || undefined,
      supabaseAnonKey: supabaseKeyInput.trim() || undefined,
    };
    setSettings(updated);
    saveAppSettings(updated);
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cric-masters-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Data exported to JSON file!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportSubmit = () => {
    if (!importInput.trim()) return;
    const success = importAllData(importInput);
    if (success) {
      alert('Data imported successfully! The app will reload.');
      window.location.reload();
    } else {
      alert('Invalid JSON data format. Import failed.');
    }
  };

  const handleResetApp = () => {
    if (
      confirm(
        'WARNING: Are you sure you want to reset all application data? This will restore initial players and clear all local history.'
      )
    ) {
      if (confirm('Second Confirmation: Erase all Cric Masters local data?')) {
        resetAllData();
        window.location.reload();
      }
    }
  };

  const isCloudConnected = isSupabaseAvailable();

  if (!isAuthenticated) {
    return (
      <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-6">
        <div className="bg-gradient-to-b from-stadium-900 via-stadium-950 to-stadium-900 border border-stadium-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <img
              src="./cric.png"
              alt="Cric Masters Logo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
            <div className="w-12 h-12 rounded-2xl bg-stadium-800 border border-stadium-700 flex items-center justify-center text-gold-400 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                RESTRICTED SETTINGS ACCESS
              </h2>
              <p className="text-xs text-stadium-400 mt-1">
                Admin authentication required for Vasu.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center justify-center space-x-1.5 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-stadium-300 block mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Enter username (vasu)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-turf-400"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stadium-300 block mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-turf-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black text-sm shadow-xl shadow-turf-500/20 hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>LOG IN AS VASU</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-4">
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 flex items-center justify-between shadow-md">
        <div>
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-turf-400" />
            <span>APP SETTINGS & BACKUP</span>
          </h2>
          <div className="text-[10px] text-turf-400 font-bold uppercase tracking-wider mt-0.5 flex items-center space-x-1">
            <UserCheck className="w-3 h-3" />
            <span>Authenticated as Vasu</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-stadium-800 hover:bg-rose-950/40 text-stadium-300 hover:text-rose-400 rounded-xl text-xs font-bold border border-stadium-700 hover:border-rose-500/40 transition-all flex items-center space-x-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-turf-500/20 border border-turf-500/40 rounded-2xl text-xs font-bold text-turf-300 flex items-center justify-center space-x-1.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-turf-400" />
          <span>{message}</span>
        </div>
      )}

      {/* DISPLAY THEME TOGGLE CARD */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 space-y-3 shadow-lg">
        <div className="text-xs font-bold text-stadium-300 uppercase tracking-wider border-b border-stadium-800 pb-2">
          Display Theme (Ground Sunlight Mode)
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-extrabold text-sm text-white">High Visibility Light Mode</div>
            <div className="text-xs text-stadium-400">Enhances visibility under bright sunlight at the ground</div>
          </div>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs border transition-all flex items-center space-x-1.5 ${
                theme === 'light'
                  ? 'bg-amber-500 text-stadium-950 border-amber-400 shadow-md'
                  : 'bg-stadium-950 text-stadium-300 border-stadium-700'
              }`}
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-stadium-950" />
                  <span>LIGHT ON</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-stadium-400" />
                  <span>DARK MODE</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ALGORITHM SETTINGS */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="text-xs font-bold text-stadium-300 uppercase tracking-wider border-b border-stadium-800 pb-2">
          Team Generation & Toss Preferences
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-stadium-300 block mb-1">
              Max Consecutive Same Toss Streak (Default: 2)
            </label>
            <select
              value={settings.maxTossStreak}
              onChange={(e) =>
                setSettings({ ...settings, maxTossStreak: parseInt(e.target.value) })
              }
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-turf-400"
            >
              <option value={1}>1 (Strict alternate)</option>
              <option value={2}>2 (Standard - Max 2 in a row)</option>
              <option value={3}>3 (Max 3 in a row)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-stadium-300 block mb-1">
              Repetition Penalty Window (Past Matches)
            </label>
            <select
              value={settings.historyWindowSize}
              onChange={(e) =>
                setSettings({ ...settings, historyWindowSize: parseInt(e.target.value) })
              }
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-turf-400"
            >
              <option value={3}>Past 3 matches</option>
              <option value={5}>Past 5 matches (Recommended)</option>
              <option value={10}>Past 10 matches</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full py-2.5 bg-turf-500 hover:bg-turf-600 text-stadium-950 font-black text-xs rounded-xl shadow-md transition-all"
        >
          Save Preferences
        </button>
      </div>

      {/* DATA EXPORT & IMPORT */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="text-xs font-bold text-stadium-300 uppercase tracking-wider border-b border-stadium-800 pb-2">
          Data Management
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="py-3 bg-stadium-800 hover:bg-stadium-700 text-stadium-100 rounded-xl font-bold text-xs border border-stadium-700 transition-all flex items-center justify-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-turf-400" />
            <span>EXPORT JSON</span>
          </button>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="py-3 bg-stadium-800 hover:bg-stadium-700 text-stadium-100 rounded-xl font-bold text-xs border border-stadium-700 transition-all flex items-center justify-center space-x-1.5"
          >
            <Upload className="w-4 h-4 text-gold-400" />
            <span>IMPORT JSON</span>
          </button>
        </div>

        {showImportArea && (
          <div className="space-y-2 pt-2 animate-fade-in">
            <textarea
              placeholder="Paste exported JSON data here..."
              rows={4}
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-turf-400 font-mono"
            />
            <button
              onClick={handleImportSubmit}
              className="w-full py-2 bg-gold-500 hover:bg-gold-600 text-stadium-950 font-black text-xs rounded-xl shadow-md"
            >
              Restore Data
            </button>
          </div>
        )}
      </div>

      {/* SUPABASE CLOUD PERSISTENCE (OPTIONAL) */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-stadium-800 pb-2">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-turf-400" />
            <span className="text-xs font-bold text-stadium-300 uppercase tracking-wider">
              Cloud Backup (Supabase)
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isCloudConnected
                ? 'bg-turf-500/20 text-turf-400 border-turf-500/40'
                : 'bg-stadium-800 text-stadium-500 border-stadium-700'
            }`}
          >
            {isCloudConnected ? 'Connected' : 'Offline / Local Only'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-stadium-400 block mb-1">
              VITE_SUPABASE_URL
            </label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrlInput}
              onChange={(e) => setSupabaseUrlInput(e.target.value)}
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-turf-400 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-stadium-400 block mb-1">
              VITE_SUPABASE_ANON_KEY
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={supabaseKeyInput}
              onChange={(e) => setSupabaseKeyInput(e.target.value)}
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-turf-400 font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full py-2 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 font-bold text-xs rounded-xl border border-stadium-700"
        >
          Save Cloud Keys
        </button>
      </div>

      {/* DANGER ZONE RESET */}
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 space-y-3 text-center">
        <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">
          Danger Zone
        </div>
        <button
          onClick={handleResetApp}
          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span>RESET ALL APPLICATION DATA</span>
        </button>
      </div>
    </div>
  );
};
