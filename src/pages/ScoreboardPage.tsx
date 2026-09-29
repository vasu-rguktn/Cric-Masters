import React, { useState, useEffect } from 'react';
import type { MatchSession } from '../types/match';
import { UmpireControls } from '../components/UmpireControls';
import { getTodayMatchesByDate, saveCurrentMatch } from '../services/storageService';
import { fetchTodayMatchesFromSupabase, subscribeToMatchUpdates } from '../services/supabaseService';
import { getTodayIsoDate, formatDateDisplay } from '../utils/dates';
import { RefreshCw } from 'lucide-react';

interface ScoreboardPageProps {
  currentMatch: MatchSession | null;
  setCurrentMatch: React.Dispatch<React.SetStateAction<MatchSession | null>>;
}

export const ScoreboardPage: React.FC<ScoreboardPageProps> = ({ currentMatch, setCurrentMatch }) => {
  const [activeMatchNumber, setActiveMatchNumber] = useState<1 | 2>(
    currentMatch?.matchNumber === 2 ? 2 : 1
  );
  const [isUmpireMode, setIsUmpireMode] = useState(false);
  const [match1, setMatch1] = useState<MatchSession | null>(null);
  const [match2, setMatch2] = useState<MatchSession | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const todayStr = currentMatch?.date || getTodayIsoDate();

  const loadScoreboardData = async (silent: boolean = false) => {
    if (!silent) setIsSyncing(true);

    const local = getTodayMatchesByDate(todayStr);
    let m1 = local.match1;
    let m2 = local.match2;

    try {
      const cloudMatches = await fetchTodayMatchesFromSupabase(todayStr);
      if (cloudMatches && cloudMatches.length > 0) {
        const cloudM1 = cloudMatches.find((m) => m.matchNumber === 1);
        const cloudM2 = cloudMatches.find((m) => m.matchNumber === 2);
        if (cloudM1) m1 = cloudM1;
        if (cloudM2) m2 = cloudM2;
      }
    } catch (e) {
      // use local
    }

    setMatch1(m1);
    setMatch2(m2);

    const active = activeMatchNumber === 1 ? m1 : m2;
    if (active) {
      setCurrentMatch(active);
    }
    if (!silent) setIsSyncing(false);
  };

  useEffect(() => {
    loadScoreboardData();

    const unsubscribe = subscribeToMatchUpdates(todayStr, (updatedMatch) => {
      if (updatedMatch.matchNumber === 2) {
        setMatch2(updatedMatch);
      } else {
        setMatch1(updatedMatch);
      }

      if (
        (activeMatchNumber === 1 && (updatedMatch.matchNumber === 1 || !updatedMatch.matchNumber)) ||
        (activeMatchNumber === 2 && updatedMatch.matchNumber === 2)
      ) {
        setCurrentMatch(updatedMatch);
        saveCurrentMatch(updatedMatch);
      }
    });

    const interval = setInterval(() => {
      loadScoreboardData(true);
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [todayStr, activeMatchNumber]);

  useEffect(() => {
    const target = activeMatchNumber === 1 ? match1 : match2;
    if (target) {
      setCurrentMatch(target);
    }
  }, [activeMatchNumber, match1, match2]);

  const activeMatch = activeMatchNumber === 1 ? match1 || currentMatch : match2 || currentMatch;

  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto space-y-4 animate-fade-in">
        {/* Match 1 / 2 Selector */}
        <div className="bg-stadium-900/90 border border-stadium-800 p-1.5 rounded-2xl flex items-center space-x-1.5 shadow-lg">
          <button
            onClick={() => setActiveMatchNumber(1)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
              activeMatchNumber === 1
                ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md'
                : 'text-stadium-300 hover:bg-stadium-800'
            }`}
          >
            MATCH 1
          </button>
          <button
            onClick={() => setActiveMatchNumber(2)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
              activeMatchNumber === 2
                ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md'
                : 'text-stadium-300 hover:bg-stadium-800'
            }`}
          >
            MATCH 2
          </button>
        </div>

        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center bg-stadium-900 border border-stadium-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stadium-800 flex items-center justify-center text-turf-400 font-bold text-xl">
            🏏
          </div>
          <p className="text-white font-extrabold text-base">
            No active teams generated for Match {activeMatchNumber}.
          </p>
          <p className="text-xs text-stadium-400 max-w-xs">
            Generate or reuse teams in the <strong>Today</strong> tab. Once created, live scores will automatically sync
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
          className="p-1 text-stadium-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* MATCH 1 / MATCH 2 SWITCHER */}
      <div className="bg-stadium-900/90 border border-stadium-800 p-1.5 rounded-2xl flex items-center space-x-1.5 shadow-lg">
        <button
          onClick={() => setActiveMatchNumber(1)}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeMatchNumber === 1
              ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md shadow-turf-500/20'
              : 'text-stadium-300 hover:bg-stadium-800'
          }`}
        >
          <span>MATCH 1</span>
          {match1?.teamA && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeMatchNumber === 1
                  ? 'bg-stadium-950/30 text-stadium-950'
                  : 'bg-turf-500/20 text-turf-400'
              }`}
            >
              LIVE
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMatchNumber(2)}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeMatchNumber === 2
              ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md shadow-turf-500/20'
              : 'text-stadium-300 hover:bg-stadium-800'
          }`}
        >
          <span>MATCH 2</span>
          {match2?.teamA && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeMatchNumber === 2
                  ? 'bg-stadium-950/30 text-stadium-950'
                  : 'bg-gold-500/20 text-gold-400'
              }`}
            >
              LIVE
            </span>
          )}
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Scoreboard — M{activeMatchNumber}</h2>
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
          <h2 className="text-2xl font-black text-white">MATCH {activeMatchNumber} COMPLETED</h2>
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
