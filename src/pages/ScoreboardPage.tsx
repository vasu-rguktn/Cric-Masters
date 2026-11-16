import React, { useState, useEffect } from 'react';
import type { MatchSession } from '../types/match';
import { UmpireControls } from '../components/UmpireControls';
import { saveCurrentMatch } from '../services/storageService';
import { fetchLatestTodayMatchFromSupabase, subscribeToMatchUpdates, isSupabaseAvailable } from '../services/supabaseService';
import { getTodayIsoDate, formatDateDisplay } from '../utils/dates';
import { RefreshCw } from 'lucide-react';

interface ScoreboardPageProps {
  currentMatch: MatchSession | null;
  setCurrentMatch: React.Dispatch<React.SetStateAction<MatchSession | null>>;
}

export const ScoreboardPage: React.FC<ScoreboardPageProps> = ({ currentMatch, setCurrentMatch }) => {
  const [isUmpireMode, setIsUmpireMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const todayStr = getTodayIsoDate();

  const loadScoreboardData = async (silent: boolean = false) => {
    if (!silent) setIsSyncing(true);

    try {
      if (isSupabaseAvailable()) {
        const cloudMatch = await fetchLatestTodayMatchFromSupabase(todayStr);
        if (cloudMatch) {
          setCurrentMatch(cloudMatch);
          saveCurrentMatch(cloudMatch);
        }
      }
    } catch {
      // use local
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadScoreboardData(true);

    const unsubscribe = subscribeToMatchUpdates(todayStr, (updatedMatch) => {
      if (updatedMatch && updatedMatch.date === todayStr) {
        setCurrentMatch(updatedMatch);
        saveCurrentMatch(updatedMatch);
      }
    });

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (!isSupabaseAvailable()) return;
      loadScoreboardData(true);
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [todayStr]);

  const activeMatch = currentMatch && currentMatch.date === todayStr ? currentMatch : null;

  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-4 animate-fade-in">
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center bg-stadium-900 border border-stadium-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stadium-800 flex items-center justify-center text-turf-400 font-bold text-xl">
            🏏
          </div>
          <p className="text-white font-extrabold text-base">
            No active teams generated for today ({formatDateDisplay(todayStr)}).
          </p>
          <p className="text-xs text-stadium-400 max-w-xs">
            Generate teams in the <strong>Today</strong> tab. Once created, live scores will automatically sync
            here across all phones.
          </p>
        </div>
      </div>
    );
  }

  const scorecard = activeMatch.scorecard || {
    teamAScore: { runs: 0, wickets: 0, overs: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    playerStats: {},
    isCompleted: false,
  };

  const teamAName = activeMatch.teamA?.name || 'Team A';
  const teamBName = activeMatch.teamB?.name || 'Team B';

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainder = balls % 6;
    return `${overs}.${remainder}`;
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Realtime Live Sync Bar */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-2xl p-2.5 px-3.5 shadow-md flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-turf-400 animate-pulse"></span>
          <span className="font-extrabold text-turf-400 uppercase tracking-wider">
            Live Scoreboard (Synced)
          </span>
        </div>
        <button
          onClick={() => loadScoreboardData(false)}
          className="p-1 text-stadium-400 hover:text-white transition-colors flex items-center space-x-1"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-turf-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-bold">SYNC</span>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Today's Scoreboard</h2>
          <p className="text-[11px] font-bold text-stadium-400">{formatDateDisplay(activeMatch.date)}</p>
        </div>

        <button
          onClick={() => setIsUmpireMode(!isUmpireMode)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isUmpireMode
              ? 'bg-turf-500 text-stadium-950 font-black shadow-md'
              : 'bg-stadium-800 text-stadium-200 border border-stadium-700'
          }`}
        >
          {isUmpireMode ? 'Exit Umpire Mode' : 'Umpire Mode'}
        </button>
      </div>

      {/* TEAM SCORE CARDS */}
      <div className="space-y-4">
        <div className="bg-stadium-800/80 rounded-2xl p-5 border border-stadium-700/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <h3 className="text-lg font-bold text-stadium-200 mb-2">{teamAName}</h3>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-black text-white">{scorecard.teamAScore.runs}</span>
            <span className="text-2xl font-bold text-stadium-400">/ {scorecard.teamAScore.wickets}</span>
          </div>
          <div className="mt-1 text-sm text-stadium-400 font-medium">
            Overs: {formatOvers(scorecard.teamAScore.overs)}
          </div>
        </div>

        <div className="bg-stadium-800/80 rounded-2xl p-5 border border-stadium-700/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <h3 className="text-lg font-bold text-stadium-200 mb-2">{teamBName}</h3>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-black text-white">{scorecard.teamBScore.runs}</span>
            <span className="text-2xl font-bold text-stadium-400">/ {scorecard.teamBScore.wickets}</span>
          </div>
          <div className="mt-1 text-sm text-stadium-400 font-medium">
            Overs: {formatOvers(scorecard.teamBScore.overs)}
          </div>
        </div>
      </div>

      {/* BATSMEN AT CREASE */}
      {(scorecard.currentStrikerId || scorecard.currentNonStrikerId) && (
        <div className="bg-stadium-800/80 rounded-2xl p-4 border border-stadium-700/50 shadow-xl">
          <h3 className="text-xs font-bold text-stadium-400 mb-3 uppercase tracking-wider">At The Crease</h3>

          {scorecard.currentStrikerId && (
            <div className="flex justify-between items-center text-white mb-2 bg-stadium-900/50 p-2 rounded-lg border border-turf-500/30">
              <div className="flex items-center space-x-2">
                <span className="text-turf-400 text-xs animate-pulse">▶</span>
                <span className="font-bold">
                  {scorecard.playerStats[scorecard.currentStrikerId]?.playerName ||
                    activeMatch.teamA?.players.find((p) => p.id === scorecard.currentStrikerId)?.name ||
                    activeMatch.teamB?.players.find((p) => p.id === scorecard.currentStrikerId)?.name ||
                    'Striker'}
                </span>
              </div>
              <div className="text-sm font-black flex items-baseline space-x-1">
                <span>{scorecard.playerStats[scorecard.currentStrikerId]?.runsScored || 0}</span>
                <span className="text-xs text-stadium-400 font-medium">
                  ({scorecard.playerStats[scorecard.currentStrikerId]?.ballsFaced || 0})
                </span>
              </div>
            </div>
          )}

          {scorecard.currentNonStrikerId && (
            <div className="flex justify-between items-center text-stadium-200 p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-transparent text-xs">▶</span>
                <span className="font-semibold">
                  {scorecard.playerStats[scorecard.currentNonStrikerId]?.playerName ||
                    activeMatch.teamA?.players.find((p) => p.id === scorecard.currentNonStrikerId)?.name ||
                    activeMatch.teamB?.players.find((p) => p.id === scorecard.currentNonStrikerId)?.name ||
                    'Non-Striker'}
                </span>
              </div>
              <div className="text-sm font-bold flex items-baseline space-x-1">
                <span>{scorecard.playerStats[scorecard.currentNonStrikerId]?.runsScored || 0}</span>
                <span className="text-xs text-stadium-400 font-medium">
                  ({scorecard.playerStats[scorecard.currentNonStrikerId]?.ballsFaced || 0})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOWLER ON STRIKE */}
      {scorecard.currentBowlerId && (
        <div className="bg-stadium-800/80 rounded-2xl p-4 border border-stadium-700/50 shadow-xl">
          <h3 className="text-xs font-bold text-stadium-400 mb-3 uppercase tracking-wider">Current Bowler</h3>
          <div className="flex justify-between items-center text-white bg-stadium-900/50 p-2 rounded-lg border border-red-500/30">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-xs">⚽</span>
              <span className="font-bold">
                {scorecard.playerStats[scorecard.currentBowlerId]?.playerName ||
                  activeMatch.teamA?.players.find((p) => p.id === scorecard.currentBowlerId)?.name ||
                  activeMatch.teamB?.players.find((p) => p.id === scorecard.currentBowlerId)?.name ||
                  'Bowler'}
              </span>
            </div>
            <div className="text-xs font-medium text-stadium-300 flex items-center space-x-3">
              <span>
                {Math.floor((scorecard.playerStats[scorecard.currentBowlerId]?.oversBowled || 0) / 6)}.
                {(scorecard.playerStats[scorecard.currentBowlerId]?.oversBowled || 0) % 6} Overs
              </span>
              <span>{scorecard.playerStats[scorecard.currentBowlerId]?.runsConceded || 0} Runs</span>
              <span className="font-bold text-white">
                {scorecard.playerStats[scorecard.currentBowlerId]?.wicketsTaken || 0} W
              </span>
            </div>
          </div>
        </div>
      )}

      {scorecard.isCompleted ? (
        <div className="bg-stadium-900/90 rounded-3xl p-6 border-2 border-turf-500 shadow-2xl text-center space-y-4">
          <h2 className="text-2xl font-black text-white">TODAY'S MATCH COMPLETED</h2>
          <div className="text-lg font-bold text-stadium-300">
            {activeMatch.winnerTeamId === 'TIE'
              ? "It's a Tie!"
              : `${activeMatch.winnerTeamId === 'teamA' ? teamAName : teamBName} Won!`}
          </div>
          <p className="text-xs text-stadium-400">Match result is synced across all devices.</p>
        </div>
      ) : (
        isUmpireMode && (
          <UmpireControls
            currentMatch={activeMatch}
            setCurrentMatch={setCurrentMatch}
            scorecard={scorecard}
          />
        )
      )}
    </div>
  );
};
