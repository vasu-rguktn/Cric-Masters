import React, { useState, useEffect } from 'react';
import type { Player } from '../types/player';
import type { MatchSession } from '../types/match';
import { TossCoin } from '../components/TossCoin';
import { Users, Play, Calendar, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { formatDateDisplay } from '../utils/dates';

interface HomeProps {
  players: Player[];
  selectedPlayerIds: string[];
  currentMatch: MatchSession | null;
  onNavigate: (tab: 'home' | 'today' | 'players' | 'history' | 'settings') => void;
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto px-4 pt-4">
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
              className="w-36 h-36 object-contain drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-turf-500/20 border border-turf-500/40 text-turf-400 text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-turf-400" />
          <span>Faculty Cricket Match Engine</span>
        </div>

        <p className="text-xs font-bold text-stadium-300">
          Smart daily team generator & instant coin toss for faculty matches.
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
              <div className="leading-none text-xl">MAKE TEAMS</div>
              <div className="text-[11px] font-bold text-stadium-950/80 mt-1 uppercase tracking-wide">
                Auto Balance {selectedPlayerIds.length} Players
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
            <span>Review Player Check-in</span>
          </div>
          <span className="text-xs font-mono font-bold text-turf-400">
            {selectedPlayerIds.length}/{players.filter((p) => p.isActive).length}
          </span>
        </button>
      </div>

      {/* Instant Coin Toss Tool Widget */}
      <div className="space-y-2">
        <div className="text-xs font-black text-stadium-300 uppercase tracking-wider px-1">
          Quick Coin Toss
        </div>
        <TossCoin />
      </div>

      {/* Latest Match Overview Widget */}
      {currentMatch && currentMatch.teamA && currentMatch.teamB && (
        <div
          onClick={() => onNavigate('today')}
          className="bg-stadium-900 border border-stadium-800 hover:border-stadium-700 rounded-3xl p-4 cursor-pointer transition-all space-y-2 shadow-lg"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-stadium-300 font-black uppercase tracking-wider">
              Today's Generated Match
            </span>
            <span className="text-turf-400 font-mono text-[11px] font-bold">
              {formatDateDisplay(currentMatch.date)}
            </span>
          </div>

          <div className="flex items-center justify-around py-2 border-y border-stadium-800 text-sm font-black">
            <span className="text-turf-400">{currentMatch.teamA.name}</span>
            <span className="text-xs text-stadium-400 font-mono font-extrabold">VS</span>
            <span className="text-gold-400">{currentMatch.teamB.name}</span>
          </div>

          <div className="text-[11px] text-center text-stadium-300 font-bold">
            Tap to view teams, swap captains, lock or share match details →
          </div>
        </div>
      )}
    </div>
  );
};
