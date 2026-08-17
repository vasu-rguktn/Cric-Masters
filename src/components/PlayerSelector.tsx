import React from 'react';
import type { Player } from '../types/player';
import { Check, UserCheck, Users } from 'lucide-react';

interface PlayerSelectorProps {
  players: Player[];
  selectedIds: string[];
  onTogglePlayer: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectYesterday?: (yesterdayIds: string[]) => void;
}

export const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  players,
  selectedIds,
  onTogglePlayer,
  onSelectAll,
  onClearAll,
}) => {
  const activePlayers = players.filter((p) => p.isActive);
  const regulars = activePlayers.filter((p) => p.isRegular);
  const occasionals = activePlayers.filter((p) => !p.isRegular);

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <div className="space-y-4">
      {/* Ground Check-in Header Box */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-turf-400" />
            <div>
              <h2 className="font-extrabold text-white text-base tracking-wider leading-none">
                GROUND CHECK-IN
              </h2>
              <p className="text-[10px] text-stadium-400 font-semibold uppercase tracking-wider mt-0.5">
                Select present players for today's match
              </p>
            </div>
          </div>

          <div className="bg-turf-500/20 border border-turf-500/40 rounded-2xl px-3 py-1 text-center">
            <div className="text-xl font-black text-turf-400 leading-none">
              {selectedIds.length}
            </div>
            <div className="text-[9px] font-extrabold text-turf-400 uppercase tracking-widest mt-0.5">
              PLAYERS
            </div>
          </div>
        </div>

        {/* Quick Bulk Selection Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stadium-800 text-xs">
          <button
            onClick={onSelectAll}
            className="flex-1 py-2 bg-stadium-800 hover:bg-stadium-700 text-white rounded-xl font-extrabold border border-stadium-700 transition-all text-[11px]"
          >
            SELECT ALL ({activePlayers.length})
          </button>
          <button
            onClick={onClearAll}
            className="flex-1 py-2 bg-stadium-800 hover:bg-stadium-700 text-stadium-300 rounded-xl font-bold border border-stadium-700 transition-all text-[11px]"
          >
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* REGULAR FACULTY PLAYERS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-stadium-300 uppercase tracking-wider px-1">
          <span className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-turf-400" />
            <span>Regular Faculty ({regulars.length})</span>
          </span>
          <span className="text-[10px] text-turf-400 font-bold">
            {regulars.filter((p) => isSelected(p.id)).length} selected
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {regulars.map((player) => {
            const checked = isSelected(player.id);
            return (
              <div
                key={player.id}
                onClick={() => onTogglePlayer(player.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between shadow-sm ${
                  checked
                    ? 'bg-turf-500/20 border-turf-500 text-white font-extrabold shadow-turf-500/10'
                    : 'bg-stadium-900 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-sm truncate text-white">{player.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {player.roles.slice(0, 2).map((roleStr, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-stadium-800 text-stadium-300 font-semibold border border-stadium-700"
                      >
                        {roleStr}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                    checked
                      ? 'bg-turf-500 border-turf-400 text-stadium-950 shadow-md'
                      : 'border-stadium-700 bg-stadium-800 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OCCASIONAL FACULTY PLAYERS */}
      {occasionals.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-black text-stadium-300 uppercase tracking-wider px-1">
            <span>Occasional Players ({occasionals.length})</span>
            <span className="text-[10px] text-gold-400 font-bold">
              {occasionals.filter((p) => isSelected(p.id)).length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {occasionals.map((player) => {
              const checked = isSelected(player.id);
              return (
                <div
                  key={player.id}
                  onClick={() => onTogglePlayer(player.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between shadow-sm ${
                    checked
                      ? 'bg-gold-500/20 border-gold-500 text-white font-extrabold shadow-gold-500/10'
                      : 'bg-stadium-900 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-1">
                      <span className="font-extrabold text-sm truncate text-white">{player.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.roles.slice(0, 2).map((roleStr, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-stadium-800 text-stadium-300 font-semibold border border-stadium-700"
                        >
                          {roleStr}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      checked
                        ? 'bg-gold-500 border-gold-400 text-stadium-950 shadow-md'
                        : 'border-stadium-700 bg-stadium-800 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
