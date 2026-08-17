import React, { useState } from 'react';
import type { MatchSession, TossRecord } from '../types/match';
import { getMatchHistory, saveMatchToHistory, getTossHistory } from '../services/storageService';
import { formatDateDisplay } from '../utils/dates';
import { shareOrCopyMatch } from '../utils/sharing';
import { History, Trophy, Dices, Share2, Calendar } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [matches, setMatches] = useState<MatchSession[]>(() => getMatchHistory().reverse());
  const [tosses] = useState<TossRecord[]>(() => getTossHistory().reverse());
  const [activeTab, setActiveTab] = useState<'matches' | 'tosses'>('matches');

  const handleSetWinner = (matchId: string, winner: 'teamA' | 'teamB' | 'TIE') => {
    const updated = matches.map((m) =>
      m.id === matchId ? { ...m, winnerTeamId: winner } : m
    );
    setMatches(updated);

    const targetMatch = updated.find((m) => m.id === matchId);
    if (targetMatch) {
      saveMatchToHistory(targetMatch);
    }
  };

  const handleShareHistoryMatch = async (match: MatchSession) => {
    await shareOrCopyMatch(match);
    alert('Match details copied to clipboard!');
  };

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-4">
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-turf-400" />
            <span>MATCH & TOSS LOG</span>
          </h2>
          <span className="text-xs text-stadium-400 font-mono">
            {matches.length} Saved Matches
          </span>
        </div>

        <div className="flex items-center space-x-1 bg-stadium-950 p-1 rounded-xl border border-stadium-800">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-turf-500 text-stadium-950 shadow-md'
                : 'text-stadium-400 hover:text-white'
            }`}
          >
            Match History ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('tosses')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tosses'
                ? 'bg-turf-500 text-stadium-950 shadow-md'
                : 'text-stadium-400 hover:text-white'
            }`}
          >
            Toss Log ({tosses.length})
          </button>
        </div>
      </div>

      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-8 text-center text-stadium-400 text-xs">
              No matches generated yet. Tap MAKE TEAMS on the home tab to start!
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.id}
                className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-stadium-800 pb-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-turf-400 font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDateDisplay(match.date)}</span>
                  </div>
                  <button
                    onClick={() => handleShareHistoryMatch(match)}
                    className="p-1 text-stadium-400 hover:text-white rounded-lg hover:bg-stadium-800"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {match.teamA && match.teamB && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stadium-950 p-2.5 rounded-xl border border-stadium-800 space-y-1">
                      <div className="font-extrabold text-turf-400 line-clamp-1">
                        {match.teamA.name}
                      </div>
                      <div className="text-[10px] text-stadium-400 font-mono">
                        {match.teamA.players.length} Players
                      </div>
                    </div>

                    <div className="bg-stadium-950 p-2.5 rounded-xl border border-stadium-800 space-y-1">
                      <div className="font-extrabold text-gold-400 line-clamp-1">
                        {match.teamB.name}
                      </div>
                      <div className="text-[10px] text-stadium-400 font-mono">
                        {match.teamB.players.length} Players
                      </div>
                    </div>
                  </div>
                )}

                {match.tossResult && (
                  <div className="text-[11px] text-stadium-300 flex items-center justify-center space-x-1 bg-stadium-950/50 p-1.5 rounded-xl border border-stadium-800">
                    <Dices className="w-3.5 h-3.5 text-turf-400" />
                    <span>Toss Outcome: </span>
                    <span className="font-bold text-white">{match.tossResult}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-stadium-800 flex items-center justify-between text-xs">
                  <span className="text-stadium-400 font-semibold flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 text-gold-400" />
                    <span>Winner:</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleSetWinner(match.id, 'teamA')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        match.winnerTeamId === 'teamA'
                          ? 'bg-turf-500 text-stadium-950 border-turf-400'
                          : 'bg-stadium-950 text-stadium-400 border-stadium-800'
                      }`}
                    >
                      Team 1
                    </button>
                    <button
                      onClick={() => handleSetWinner(match.id, 'teamB')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        match.winnerTeamId === 'teamB'
                          ? 'bg-gold-500 text-stadium-950 border-gold-400'
                          : 'bg-stadium-950 text-stadium-400 border-stadium-800'
                      }`}
                    >
                      Team 2
                    </button>
                    <button
                      onClick={() => handleSetWinner(match.id, 'TIE')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        match.winnerTeamId === 'TIE'
                          ? 'bg-amber-500 text-stadium-950 border-amber-400'
                          : 'bg-stadium-950 text-stadium-400 border-stadium-800'
                      }`}
                    >
                      Tie
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'tosses' && (
        <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 space-y-3 shadow-lg">
          <div className="text-xs font-bold text-stadium-400 uppercase tracking-wider">
            Chronological Toss Log
          </div>

          {tosses.length === 0 ? (
            <div className="text-center py-6 text-stadium-400 text-xs">
              No coin tosses recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {tosses.map((t) => (
                <div
                  key={t.id}
                  className="bg-stadium-950 border border-stadium-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-stadium-400 font-mono text-[10px]">
                    {new Date(t.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-md border ${
                      t.outcome === 'HEADS'
                        ? 'bg-turf-500/20 text-turf-400 border-turf-500/40'
                        : 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                    }`}
                  >
                    {t.outcome}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
