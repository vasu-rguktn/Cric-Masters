import React, { useState, useEffect } from 'react';
import type { Player } from '../types/player';
import type { MatchSession } from '../types/match';
import { TossCoin } from '../components/TossCoin';
import { Users, Play, Calendar, ArrowRight, ShieldCheck, Clock, Star, Target } from 'lucide-react';
import { getTodayIsoDate } from '../utils/dates';
import { getMatchHistory, getTodayMatchesByDate } from '../services/storageService';
import { fetchTodayMatchesFromSupabase, subscribeToMatchUpdates } from '../services/supabaseService';

interface HomeProps {
  players: Player[];
  selectedPlayerIds: string[];
  currentMatch: MatchSession | null;
  onNavigate: (tab: 'home' | 'today' | 'players' | 'history' | 'score' | 'settings') => void;
  onMakeTeamsClick: () => void;
}

export const Home: React.FC<HomeProps> = ({
  players,
  selectedPlayerIds,
  currentMatch,
  onNavigate,
  onMakeTeamsClick,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [match1, setMatch1] = useState<MatchSession | null>(null);
  const [match2, setMatch2] = useState<MatchSession | null>(null);
  const [lastMatchStats, setLastMatchStats] = useState<{
    batsman: { name: string; runs: number; balls: number } | null;
    bowler: { name: string; wickets: number; runs: number } | null;
  } | null>(null);

  const todayStr = currentMatch?.date || getTodayIsoDate();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayMatches = async () => {
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
  };

  useEffect(() => {
    loadTodayMatches();

    const unsubscribe = subscribeToMatchUpdates(todayStr, (updatedMatch) => {
      if (updatedMatch.matchNumber === 2) {
        setMatch2(updatedMatch);
      } else {
        setMatch1(updatedMatch);
      }
    });

    const interval = setInterval(() => {
      loadTodayMatches();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [todayStr]);

  useEffect(() => {
    const history = getMatchHistory();
    const lastValidMatch = history
      .slice()
      .reverse()
      .find(
        (m) =>
          m.scorecard &&
          m.scorecard.playerStats &&
          Object.keys(m.scorecard.playerStats).length > 0
      );

    if (lastValidMatch && lastValidMatch.scorecard) {
      let bestBat = null;
      let bestBowl = null;

      const stats = Object.values(lastValidMatch.scorecard.playerStats);
      if (stats.length > 0) {
        const topBatsmen = [...stats].sort((a, b) => b.runsScored - a.runsScored);
        if (topBatsmen[0].runsScored > 0) {
          bestBat = {
            name: topBatsmen[0].playerName,
            runs: topBatsmen[0].runsScored,
            balls: topBatsmen[0].ballsFaced,
          };
        }

        const topBowlers = [...stats].sort((a, b) => {
          if (b.wicketsTaken !== a.wicketsTaken) return b.wicketsTaken - a.wicketsTaken;
          return a.runsConceded - b.runsConceded;
        });
        if (topBowlers[0].wicketsTaken > 0 || topBowlers[0].oversBowled > 0) {
          bestBowl = {
            name: topBowlers[0].playerName,
            wickets: topBowlers[0].wicketsTaken,
            runs: topBowlers[0].runsConceded,
          };
        }
      }

      if (bestBat || bestBowl) {
        setLastMatchStats({ batsman: bestBat, bowler: bestBowl });
      }
    }
  }, []);

  const formattedDate = now
    .toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto px-4 pt-4 animate-fade-in">
      {/* Live Date & Time Bar */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-md text-xs">
        <div className="flex items-center space-x-1.5 text-turf-400 font-extrabold tracking-wider">
          <Calendar className="w-4 h-4 text-turf-400" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center space-x-1 text-gold-400 font-mono font-black bg-stadium-950 px-2.5 py-1 rounded-lg border border-stadium-800">
          <Clock className="w-3.5 h-3.5 text-gold-400" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Hero Card featuring cric.png logo */}
      <div className="bg-stadium-900 border border-turf-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-2.5 bg-stadium-950 rounded-3xl border border-turf-500/30 shadow-xl">
            <img
              src="./cric.png"
              alt="Cric Masters Logo"
              className="w-32 h-32 object-contain drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-turf-500/20 border border-turf-500/40 text-turf-400 text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-turf-400" />
          <span>Faculty Cricket Match Engine</span>
        </div>

        <p className="text-xs font-bold text-stadium-300">
          Real-time cloud sync across all phones & devices for Vasu, Vinodh Sir, RK Sir & Faculty.
        </p>

        {/* Quick Ground Status */}
        <div className="bg-stadium-950 border border-stadium-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-turf-400" />
            <span className="text-stadium-300 font-bold">Selected Today:</span>
          </div>
          <span className="font-black text-white bg-turf-500/20 px-3 py-1 rounded-xl border border-turf-500/40 text-xs">
            {selectedPlayerIds.length} Players Present
          </span>
        </div>
      </div>

      {/* TWO PRIMARY BIG ACTIONS */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={onMakeTeamsClick}
          className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-xl tracking-wider shadow-2xl shadow-turf-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-stadium-950/20 flex items-center justify-center text-stadium-950">
              <Play className="w-7 h-7 fill-current" />
            </div>
            <div className="text-left">
              <div className="leading-none text-xl">
                {match1?.teamA && match1?.teamB ? "VIEW TODAY'S TEAMS" : "MAKE TEAMS"}
              </div>
              <div className="text-[11px] font-bold text-stadium-950/80 mt-1 uppercase tracking-wide">
                {match1?.teamA && match1?.teamB
                  ? `Match 1 Ready • ${selectedPlayerIds.length} Players`
                  : `Auto Balance ${selectedPlayerIds.length} Players`}
              </div>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('today')}
          className="w-full py-4 px-6 rounded-3xl bg-stadium-900 border border-stadium-700 hover:border-turf-500/50 text-white font-black text-base shadow-xl flex items-center justify-between transition-all"
        >
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-turf-400" />
            <span>Today's Match Sessions</span>
          </div>
          <span className="text-xs font-mono font-bold text-turf-400">
            {selectedPlayerIds.length}/{players.filter((p) => p.isActive).length}
          </span>
        </button>
      </div>

      {/* TODAY'S MATCH 1 & MATCH 2 STATUS CARDS */}
      <div className="space-y-3">
        <div className="text-xs font-black text-stadium-300 uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Today's Matches</span>
          <span className="text-[10px] text-turf-400 font-mono">Live Synced</span>
        </div>

        {/* Match 1 Card */}
        {match1 && match1.teamA && match1.teamB ? (
          <div
            onClick={() => onNavigate('today')}
            className="bg-stadium-900 border border-turf-500/40 hover:border-turf-400 rounded-3xl p-5 cursor-pointer transition-all space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-turf-400 font-black uppercase tracking-wider flex items-center space-x-1.5">
                <span>🏏 MATCH 1 TEAMS READY</span>
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-turf-500/20 text-turf-400 font-bold border border-turf-500/40">
                {match1.isLocked ? 'LOCKED' : 'TEAMS READY'}
              </span>
            </div>

            <div className="flex items-center justify-around py-3 border-y border-stadium-800 text-base font-black">
              <div className="text-center">
                <div className="text-turf-400">{match1.teamA.name}</div>
                <div className="text-[10px] text-stadium-400 font-semibold mt-0.5">
                  Capt: {match1.teamA.captainName} ({match1.teamA.players.length} p)
                </div>
              </div>
              <span className="text-xs text-stadium-500 font-mono font-extrabold px-2">VS</span>
              <div className="text-center">
                <div className="text-gold-400">{match1.teamB.name}</div>
                <div className="text-[10px] text-stadium-400 font-semibold mt-0.5">
                  Capt: {match1.teamB.captainName} ({match1.teamB.players.length} p)
                </div>
              </div>
            </div>

            {match1.joker && (
              <div className="text-[10px] text-center text-gold-300 font-bold bg-gold-500/10 py-1 px-2 rounded-lg border border-gold-500/20">
                🃏 Joker Player: {match1.joker.name} (Plays on both sides)
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-stadium-400 font-medium">Live Synced for all users & devices</span>
              <span className="text-xs font-black text-turf-400 flex items-center space-x-1">
                <span>View Today's Teams</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('today')}
            className="bg-stadium-900/60 border border-stadium-800 rounded-2xl p-3 text-center cursor-pointer hover:border-stadium-700 transition-all text-xs text-stadium-400"
          >
            Match 1 not yet generated. Tap to create teams.
          </div>
        )}

        {/* Match 2 Card */}
        {match2 && match2.teamA && match2.teamB && (
          <div
            onClick={() => onNavigate('today')}
            className="bg-stadium-900 border border-gold-500/40 hover:border-gold-400 rounded-3xl p-4 cursor-pointer transition-all space-y-2 shadow-lg"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gold-400 font-black uppercase tracking-wider">
                🏏 MATCH 2
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30">
                {match2.isLocked ? 'LOCKED' : 'TEAMS READY'}
              </span>
            </div>

            <div className="flex items-center justify-around py-2 border-y border-stadium-800 text-sm font-black">
              <span className="text-turf-400 truncate max-w-[40%] text-center">{match2.teamA.name}</span>
              <span className="text-xs text-stadium-400 font-mono font-extrabold">VS</span>
              <span className="text-gold-400 truncate max-w-[40%] text-center">{match2.teamB.name}</span>
            </div>

            <div className="text-[11px] text-center text-stadium-300 font-bold">
              Tap to view Match 2 details or live scorecard →
            </div>
          </div>
        )}
      </div>

      {/* Instant Coin Toss Tool Widget */}
      <div className="space-y-2">
        <div className="text-xs font-black text-stadium-300 uppercase tracking-wider px-1">
          Quick Coin Toss
        </div>
        <TossCoin />
      </div>

      {/* Yesterday's Top Performers Widget */}
      {lastMatchStats && (
        <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 shadow-lg space-y-3">
          <div className="text-xs font-black text-stadium-300 uppercase tracking-wider text-center">
            Previous Match Star Players
          </div>
          <div className="grid grid-cols-2 gap-3">
            {lastMatchStats.batsman && (
              <div className="bg-stadium-950 p-3 rounded-2xl border border-turf-500/20 text-center flex flex-col items-center justify-center">
                <Star className="w-5 h-5 text-gold-400 mb-1" />
                <div className="text-xs font-bold text-white truncate w-full">{lastMatchStats.batsman.name}</div>
                <div className="text-xl font-black text-turf-400">{lastMatchStats.batsman.runs}</div>
                <div className="text-[10px] text-stadium-400">runs ({lastMatchStats.batsman.balls} balls)</div>
              </div>
            )}
            {lastMatchStats.bowler && (
              <div className="bg-stadium-950 p-3 rounded-2xl border border-red-500/20 text-center flex flex-col items-center justify-center">
                <Target className="w-5 h-5 text-red-400 mb-1" />
                <div className="text-xs font-bold text-white truncate w-full">{lastMatchStats.bowler.name}</div>
                <div className="text-xl font-black text-red-400">{lastMatchStats.bowler.wickets}</div>
                <div className="text-[10px] text-stadium-400">wkts for {lastMatchStats.bowler.runs}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
