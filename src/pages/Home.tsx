import React, { useState, useEffect } from 'react';
import type { Player } from '../types/player';
import type { MatchSession } from '../types/match';
import { TossCoin } from '../components/TossCoin';
import {
  Users,
  Play,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Clock,
  Star,
  Target,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { getTodayIsoDate, formatDateDisplay } from '../utils/dates';
import { getMatchHistory } from '../services/storageService';

interface HomeProps {
  players: Player[];
  selectedPlayerIds: string[];
  currentMatch: MatchSession | null;
  onNavigate: (tab: 'home' | 'today' | 'players' | 'history' | 'score' | 'settings') => void;
  onMakeTeamsClick: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastSyncedTime?: Date;
}

export const Home: React.FC<HomeProps> = ({
  players,
  selectedPlayerIds,
  currentMatch,
  onNavigate,
  onMakeTeamsClick,
  onRefresh,
  isRefreshing = false,
  lastSyncedTime = new Date(),
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [lastMatchStats, setLastMatchStats] = useState<{
    batsman: { name: string; runs: number; balls: number } | null;
    bowler: { name: string; wickets: number; runs: number } | null;
  } | null>(null);

  const todayStr = getTodayIsoDate();
  const isTodayMatchReady = Boolean(
    currentMatch &&
      currentMatch.date === todayStr &&
      currentMatch.teamA &&
      currentMatch.teamB
  );

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Previous Match Star Player calculation
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
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-4 animate-fade-in">
      {/* Live Date, Time & Immediate Cloud Sync Bar */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-3.5 shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="p-2 rounded-2xl bg-turf-500/10 border border-turf-500/30 text-turf-400">
            <Calendar className="w-5 h-5 text-turf-400" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-white truncate tracking-wide">
              {formattedDate}
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-stadium-400 mt-0.5">
              <span className="font-mono text-gold-400 font-bold flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gold-400" />
                <span>{formattedTime}</span>
              </span>
              <span>•</span>
              <span className="text-turf-400 flex items-center space-x-1 font-bold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-turf-400 animate-pulse" />
                <span>Synced {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sync / Refresh Button */}
        <button
          id="home-sync-btn"
          onClick={() => onRefresh && onRefresh()}
          disabled={isRefreshing}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-stadium-800 to-stadium-850 hover:from-stadium-750 hover:to-stadium-800 border border-turf-500/30 text-stadium-100 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-black shadow-md active:scale-95"
          title="Refresh today's match from cloud"
        >
          <RefreshCw
            className={`w-4 h-4 text-turf-400 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>{isRefreshing ? 'SYNCING...' : 'SYNC'}</span>
        </button>
      </div>

      {/* Hero Card with Cric Logo */}
      <div className="bg-stadium-900 border border-turf-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-2.5 bg-stadium-950 rounded-3xl border border-turf-500/30 shadow-xl">
            <img
              src="./cric.png"
              alt="Cric Masters Logo"
              className="w-28 h-28 object-contain drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-turf-500/20 border border-turf-500/40 text-turf-400 text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-turf-400" />
          <span>Faculty Cricket Match Engine</span>
        </div>

        <p className="text-xs font-bold text-stadium-300">
          Instant real-time match synchronization across phones for Vasu, Vinodh Sir, RK Sir & Faculty.
        </p>

        {/* Quick Ground Status */}
        <div className="bg-stadium-950 border border-stadium-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-turf-400" />
            <span className="text-stadium-300 font-bold">Present Faculty:</span>
          </div>
          <span className="font-black text-white bg-turf-500/20 px-3 py-1 rounded-xl border border-turf-500/40 text-xs">
            {selectedPlayerIds.length} of {players.filter((p) => p.isActive).length} Available
          </span>
        </div>
      </div>

      {/* PRIMARY BIG ACTION BUTTON */}
      <div>
        <button
          id="home-primary-action-btn"
          onClick={onMakeTeamsClick}
          className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-xl tracking-wider shadow-2xl shadow-turf-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-stadium-950/20 flex items-center justify-center text-stadium-950">
              {isTodayMatchReady ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-current" />
              )}
            </div>
            <div className="text-left">
              <div className="leading-none text-xl">
                {isTodayMatchReady ? "VIEW TODAY'S TEAMS" : "MAKE TODAY'S TEAMS"}
              </div>
              <div className="text-[11px] font-bold text-stadium-950/80 mt-1 uppercase tracking-wide">
                {isTodayMatchReady
                  ? `Teams Ready • ${currentMatch?.availablePlayerIds?.length || selectedPlayerIds.length} Players`
                  : `Select & Balance ${selectedPlayerIds.length} Players`}
              </div>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* TODAY'S MATCH CARD (SINGLE UNIFIED VIEW - NO M1/M2 CONFUSION) */}
      <div className="space-y-3">
        <div className="text-xs font-black text-stadium-300 uppercase tracking-wider px-1 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-turf-400" />
            <span>Today's Match</span>
          </div>
          <span className="text-[10px] text-turf-400 font-mono font-bold">
            {isTodayMatchReady ? 'Live Synced' : 'Ready to Generate'}
          </span>
        </div>

        {isTodayMatchReady && currentMatch?.teamA && currentMatch?.teamB ? (
          <div
            id="today-match-summary-card"
            onClick={() => onNavigate('today')}
            className="bg-stadium-900 border border-turf-500/40 hover:border-turf-400 rounded-3xl p-5 cursor-pointer transition-all space-y-4 shadow-2xl group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-turf-400 font-black uppercase tracking-wider flex items-center space-x-1.5">
                <span>🏏 TODAY'S TEAMS READY</span>
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-turf-500/20 text-turf-400 font-bold border border-turf-500/40">
                {currentMatch.isLocked ? 'LOCKED' : 'TEAMS READY'}
              </span>
            </div>

            {/* Teams VS Display */}
            <div className="flex items-center justify-around py-3 border-y border-stadium-800 text-base font-black">
              <div className="text-center flex-1">
                <div className="text-turf-400 truncate text-base">{currentMatch.teamA.name}</div>
                <div className="text-[11px] text-stadium-300 font-semibold mt-0.5">
                  Capt: <span className="text-white font-bold">{currentMatch.teamA.captainName}</span>
                </div>
                <div className="text-[10px] text-stadium-500 font-mono mt-0.5">
                  {currentMatch.teamA.players.length} Players
                </div>
              </div>

              <div className="px-3 text-center">
                <span className="text-xs text-stadium-500 font-mono font-extrabold bg-stadium-950 px-2 py-1 rounded-lg border border-stadium-800">
                  VS
                </span>
              </div>

              <div className="text-center flex-1">
                <div className="text-gold-400 truncate text-base">{currentMatch.teamB.name}</div>
                <div className="text-[11px] text-stadium-300 font-semibold mt-0.5">
                  Capt: <span className="text-white font-bold">{currentMatch.teamB.captainName}</span>
                </div>
                <div className="text-[10px] text-stadium-500 font-mono mt-0.5">
                  {currentMatch.teamB.players.length} Players
                </div>
              </div>
            </div>

            {/* Joker Player Badge (if present) */}
            {currentMatch.joker && (
              <div className="text-[11px] text-center text-gold-300 font-bold bg-gold-500/10 py-1.5 px-3 rounded-xl border border-gold-500/20">
                🃏 Joker Player: <span className="text-white font-extrabold">{currentMatch.joker.name}</span> (Plays on both sides)
              </div>
            )}

            {/* Toss Result Badge (if done) */}
            {currentMatch.tossResult && (
              <div className="text-[11px] text-center text-turf-300 font-bold bg-turf-500/10 py-1.5 px-3 rounded-xl border border-turf-500/20">
                🪙 Toss Result: <span className="text-white font-extrabold">{currentMatch.tossResult}</span>
              </div>
            )}

            {/* Live Scorecard Snapshot (if started) */}
            {currentMatch.scorecard && (
              <div className="bg-stadium-950 rounded-2xl p-2.5 border border-stadium-800 flex items-center justify-around text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-stadium-400 uppercase font-bold block">
                    {currentMatch.teamA.name}
                  </span>
                  <span className="text-sm font-black text-turf-400 font-mono">
                    {currentMatch.scorecard.teamAScore.runs}/{currentMatch.scorecard.teamAScore.wickets}
                  </span>
                  <span className="text-[10px] text-stadium-500 font-mono ml-1">
                    ({currentMatch.scorecard.teamAScore.overs} ov)
                  </span>
                </div>
                <span className="text-stadium-700 font-bold">•</span>
                <div className="text-center">
                  <span className="text-[10px] text-stadium-400 uppercase font-bold block">
                    {currentMatch.teamB.name}
                  </span>
                  <span className="text-sm font-black text-gold-400 font-mono">
                    {currentMatch.scorecard.teamBScore.runs}/{currentMatch.scorecard.teamBScore.wickets}
                  </span>
                  <span className="text-[10px] text-stadium-500 font-mono ml-1">
                    ({currentMatch.scorecard.teamBScore.overs} ov)
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-stadium-400 font-medium">
                Live synced on every faculty phone
              </span>
              <span className="text-xs font-black text-turf-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                <span>View Full Match Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : (
          <div
            id="today-match-empty-card"
            onClick={onMakeTeamsClick}
            className="bg-stadium-900/80 border border-stadium-800 hover:border-turf-500/40 rounded-3xl p-5 text-center cursor-pointer transition-all space-y-2.5 shadow-lg group"
          >
            <div className="w-10 h-10 mx-auto rounded-2xl bg-stadium-950 border border-stadium-800 flex items-center justify-center text-turf-400">
              <Calendar className="w-5 h-5 text-turf-400" />
            </div>
            <div className="text-sm font-bold text-white">
              No match generated yet for {formatDateDisplay(todayStr)}
            </div>
            <p className="text-xs text-stadium-400 max-w-xs mx-auto">
              Tap here to select present faculty and automatically balance teams with 1 click.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center space-x-1 text-xs font-black text-turf-400 group-hover:underline">
                <span>Start Team Selection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
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

      {/* Previous Match Star Performers Widget */}
      {lastMatchStats && (
        <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 shadow-lg space-y-3">
          <div className="text-xs font-black text-stadium-300 uppercase tracking-wider text-center">
            Previous Match Star Players
          </div>
          <div className="grid grid-cols-2 gap-3">
            {lastMatchStats.batsman && (
              <div className="bg-stadium-950 p-3 rounded-2xl border border-turf-500/20 text-center flex flex-col items-center justify-center">
                <Star className="w-5 h-5 text-gold-400 mb-1" />
                <div className="text-xs font-bold text-white truncate w-full">
                  {lastMatchStats.batsman.name}
                </div>
                <div className="text-xl font-black text-turf-400">
                  {lastMatchStats.batsman.runs}
                </div>
                <div className="text-[10px] text-stadium-400">
                  runs ({lastMatchStats.batsman.balls} balls)
                </div>
              </div>
            )}
            {lastMatchStats.bowler && (
              <div className="bg-stadium-950 p-3 rounded-2xl border border-red-500/20 text-center flex flex-col items-center justify-center">
                <Target className="w-5 h-5 text-red-400 mb-1" />
                <div className="text-xs font-bold text-white truncate w-full">
                  {lastMatchStats.bowler.name}
                </div>
                <div className="text-xl font-black text-red-400">
                  {lastMatchStats.bowler.wickets}
                </div>
                <div className="text-[10px] text-stadium-400">
                  wkts for {lastMatchStats.bowler.runs}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
