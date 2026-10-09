import React, { useState } from 'react';
import type { AppSettings } from '../types/settings';
import {
  getAppSettings,
  saveAppSettings,
  exportAllData,
  importAllData,
  resetAllData,
  getStoredPlayers,
  saveStoredPlayers,
  getMatchHistory,
  saveMatchToHistory,
  getTossHistory,
  saveTossRecord,
} from '../services/storageService';
import {
  isSupabaseAvailable,
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
  syncPlayersToSupabase,
  syncMatchToSupabase,
  syncTossRecordToSupabase,
  fetchAllPlayersFromSupabase,
  fetchMatchHistoryFromSupabase,
  fetchTossHistoryFromSupabase,
  SUPABASE_MEDIA_BUCKET,
} from '../services/supabaseService';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Database,
  CheckCircle2,
  Lock,
  UserCheck,
  LogOut,
  ShieldAlert,
  Sun,
  Moon,
  Copy,
  Check,
  CloudUpload,
  CloudDownload,
  Activity,
  Code,
  AlertCircle,
} from 'lucide-react';

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
  const [showSqlViewer, setShowSqlViewer] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tables?: { players: boolean; daily_matches: boolean; toss_history: boolean; storage: boolean };
  } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

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
      enableSupabase: Boolean(supabaseUrlInput.trim() && supabaseKeyInput.trim()),
    };
    setSettings(updated);
    saveAppSettings(updated);
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Save first to update client
    handleSaveSettings();

    const result = await testSupabaseConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handlePushAllToCloud = async () => {
    if (!isSupabaseAvailable()) {
      alert('Please configure Supabase URL & Anon Key first and click Save.');
      return;
    }

    setIsSyncingCloud(true);
    try {
      const localPlayers = getStoredPlayers();
      const localMatches = getMatchHistory();
      const localTosses = getTossHistory();

      let playersOk = false;
      let matchesOk = 0;
      let tossesOk = 0;

      if (localPlayers.length > 0) {
        playersOk = await syncPlayersToSupabase(localPlayers);
      }

      for (const m of localMatches) {
        const ok = await syncMatchToSupabase(m);
        if (ok) matchesOk++;
      }

      for (const t of localTosses) {
        const ok = await syncTossRecordToSupabase(t);
        if (ok) tossesOk++;
      }

      alert(
        `Cloud Push Complete!\n• ${playersOk ? localPlayers.length : 0} Players synced\n• ${matchesOk} Matches synced\n• ${tossesOk} Tosses synced`
      );
    } catch (e: any) {
      alert(`Push failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullAllFromCloud = async () => {
    if (!isSupabaseAvailable()) {
      alert('Please configure Supabase URL & Anon Key first.');
      return;
    }

    setIsSyncingCloud(true);
    try {
      const cloudPlayers = await fetchAllPlayersFromSupabase();
      const cloudMatches = await fetchMatchHistoryFromSupabase(100);
      const cloudTosses = await fetchTossHistoryFromSupabase(50);

      if (cloudPlayers.length > 0) {
        saveStoredPlayers(cloudPlayers);
      }
      for (const m of cloudMatches) {
        saveMatchToHistory(m);
      }
      for (const t of cloudTosses) {
        saveTossRecord(t);
      }

      alert(
        `Cloud Pull Complete!\n• ${cloudPlayers.length} Players updated\n• ${cloudMatches.length} Matches loaded\n• ${cloudTosses.length} Tosses loaded\n\nPage will now refresh.`
      );
      window.location.reload();
    } catch (e: any) {
      alert(`Pull failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsSyncingCloud(false);
    }
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
            <span>APP SETTINGS & CLOUD DB</span>
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

      {/* SUPABASE CLOUD DATABASE INTEGRATION */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-stadium-800 pb-2">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-turf-400" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Supabase Cloud Database & Storage
              </span>
              <span className="text-[10px] text-stadium-400">
                Syncs matches, scores & teams to all phones
              </span>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
              isCloudConnected
                ? 'bg-turf-500/20 text-turf-400 border-turf-500/40'
                : 'bg-stadium-800 text-stadium-500 border-stadium-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCloudConnected ? 'bg-turf-400 animate-pulse' : 'bg-stadium-600'
              }`}
            />
            <span>{isCloudConnected ? 'Live Cloud' : 'Offline Mode'}</span>
          </span>
        </div>

        {/* STEP 1: SQL SCHEMA SETUP */}
        <div className="bg-stadium-950/80 border border-stadium-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-gold-400">
              <Code className="w-4 h-4" />
              <span>Step 1: Database & Storage SQL Schema</span>
            </div>
            <button
              onClick={handleCopySql}
              className="px-2.5 py-1 bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 rounded-lg text-[11px] font-bold border border-gold-500/40 flex items-center space-x-1 transition-all"
            >
              {sqlCopied ? <Check className="w-3.5 h-3.5 text-turf-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL Script'}</span>
            </button>
          </div>
          <p className="text-[11px] text-stadium-400 leading-relaxed">
            Run this in your <strong className="text-white">Supabase Dashboard → SQL Editor</strong> to create tables (<code>players</code>, <code>daily_matches</code>, <code>toss_history</code>), enable Realtime sync, and setup the <code>{SUPABASE_MEDIA_BUCKET}</code> storage bucket.
          </p>

          <button
            onClick={() => setShowSqlViewer(!showSqlViewer)}
            className="text-[10px] text-turf-400 font-bold hover:underline flex items-center space-x-1"
          >
            <span>{showSqlViewer ? 'Hide SQL Code' : 'View SQL Code Preview'}</span>
          </button>

          {showSqlViewer && (
            <textarea
              readOnly
              rows={8}
              value={SUPABASE_SCHEMA_SQL}
              className="w-full bg-stadium-900 border border-stadium-700 rounded-xl p-2.5 text-[10px] text-stadium-200 font-mono focus:outline-none"
            />
          )}
        </div>

        {/* STEP 2: CREDENTIALS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stadium-300">
            <span>Step 2: Enter Supabase Credentials</span>
            <span className="text-[10px] text-stadium-400 font-normal">Dashboard → Project Settings → API</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-stadium-400 block mb-1">
              Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="text"
              placeholder="https://your-project-id.supabase.co"
              value={supabaseUrlInput}
              onChange={(e) => setSupabaseUrlInput(e.target.value)}
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-turf-400 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-stadium-400 block mb-1">
              Anon Public Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKeyInput}
              onChange={(e) => setSupabaseKeyInput(e.target.value)}
              className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-turf-400 font-mono"
            />
          </div>
        </div>

        {/* ACTIONS: SAVE & TEST */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleSaveSettings}
            className="py-2.5 bg-turf-500 hover:bg-turf-600 text-stadium-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Cloud Keys</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="py-2.5 bg-stadium-800 hover:bg-stadium-700 text-stadium-100 font-bold text-xs rounded-xl border border-stadium-700 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 text-gold-400 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* TEST RESULTS BOX */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs space-y-2 animate-fade-in ${
              testResult.success
                ? 'bg-turf-500/10 border-turf-500/30 text-turf-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-turf-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>

            {testResult.tables && (
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                <div className="flex items-center space-x-1">
                  <span>{testResult.tables.players ? '✅' : '❌'}</span>
                  <span>players table</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{testResult.tables.daily_matches ? '✅' : '❌'}</span>
                  <span>daily_matches table</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{testResult.tables.toss_history ? '✅' : '❌'}</span>
                  <span>toss_history table</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{testResult.tables.storage ? '✅' : '⚠️'}</span>
                  <span>media storage bucket</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: DATA SYNC (PUSH / PULL) */}
        <div className="border-t border-stadium-800 pt-3 space-y-2">
          <div className="text-xs font-bold text-stadium-300">
            Step 3: Sync Local Data with Cloud
          </div>
          <p className="text-[10px] text-stadium-400">
            Push your local players and match history to Supabase so other phones can see them immediately, or pull cloud data to this device.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handlePushAllToCloud}
              disabled={isSyncingCloud}
              className="py-2.5 bg-stadium-800 hover:bg-turf-950/40 hover:border-turf-500/40 text-stadium-200 hover:text-turf-300 rounded-xl text-xs font-bold border border-stadium-700 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4 text-turf-400" />
              <span>Push to Cloud</span>
            </button>

            <button
              onClick={handlePullAllFromCloud}
              disabled={isSyncingCloud}
              className="py-2.5 bg-stadium-800 hover:bg-gold-950/40 hover:border-gold-500/40 text-stadium-200 hover:text-gold-300 rounded-xl text-xs font-bold border border-stadium-700 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <CloudDownload className="w-4 h-4 text-gold-400" />
              <span>Pull from Cloud</span>
            </button>
          </div>
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
          Offline Backup & Restore (JSON)
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
          <span>RESET ALL LOCAL APPLICATION DATA</span>
        </button>
      </div>
    </div>
  );
};
