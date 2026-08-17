import React from 'react';
import type { Team } from '../types/team';

interface RoleSummaryProps {
  teamA: Team;
  teamB: Team;
  balanceScore: number;
  limitations: string[];
}

export const RoleSummary: React.FC<RoleSummaryProps> = ({
  teamA,
  teamB,
  balanceScore,
  limitations,
}) => {
  const getBalanceBadge = (score: number) => {
    if (score >= 85)
      return { text: 'EXCELLENT BALANCE', color: 'bg-turf-500/20 text-turf-400 border-turf-500/40' };
    if (score >= 70)
      return { text: 'GOOD BALANCE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    return { text: 'ACCEPTABLE BALANCE', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
  };

  const badge = getBalanceBadge(balanceScore);

  return (
    <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase font-extrabold tracking-wider text-stadium-300">
          Match Strength Analysis
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.color}`}>
          {badge.text} ({balanceScore}/100)
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 font-bold text-stadium-400 border-b border-stadium-800 pb-1.5 text-center">
          <div className="text-left text-turf-400 line-clamp-1">{teamA.name}</div>
          <div>ROLE</div>
          <div className="text-right text-gold-400 line-clamp-1">{teamB.name}</div>
        </div>

        <div className="grid grid-cols-3 items-center text-center py-1 border-b border-stadium-800/50">
          <div className="text-left font-mono font-bold text-white">{teamA.roleSummary.paceCount} Bowlers</div>
          <div className="text-stadium-400 font-medium">Pace</div>
          <div className="text-right font-mono font-bold text-white">{teamB.roleSummary.paceCount} Bowlers</div>
        </div>

        <div className="grid grid-cols-3 items-center text-center py-1 border-b border-stadium-800/50">
          <div className="text-left font-mono font-bold text-white">{teamA.roleSummary.spinCount} Spinners</div>
          <div className="text-stadium-400 font-medium">Spin</div>
          <div className="text-right font-mono font-bold text-white">{teamB.roleSummary.spinCount} Spinners</div>
        </div>

        <div className="grid grid-cols-3 items-center text-center py-1 border-b border-stadium-800/50">
          <div className="text-left font-mono font-bold text-white">{teamA.roleSummary.allRounderCount} All-rd</div>
          <div className="text-stadium-400 font-medium">All-Rounders</div>
          <div className="text-right font-mono font-bold text-white">{teamB.roleSummary.allRounderCount} All-rd</div>
        </div>

        <div className="grid grid-cols-3 items-center text-center py-1">
          <div className="text-left font-mono font-bold text-white">{teamA.roleSummary.batsmanCount} Batting</div>
          <div className="text-stadium-400 font-medium">Batting Depth</div>
          <div className="text-right font-mono font-bold text-white">{teamB.roleSummary.batsmanCount} Batting</div>
        </div>
      </div>

      {limitations.length > 0 && (
        <div className="pt-2 border-t border-stadium-800 space-y-1">
          {limitations.map((lim, idx) => (
            <div key={idx} className="text-[11px] text-amber-300/90 flex items-start space-x-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span>{lim}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
