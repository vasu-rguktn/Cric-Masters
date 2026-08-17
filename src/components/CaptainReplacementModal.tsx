import React, { useState } from 'react';
import type { Team } from '../types/team';
import { Crown, X, CheckCircle2 } from 'lucide-react';
import { getCaptainReplacementCandidates } from '../algorithms/captainSelector';

interface CaptainReplacementModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onSelectNewCaptain: (teamId: 'teamA' | 'teamB', newCaptainId: string) => void;
}

export const CaptainReplacementModal: React.FC<CaptainReplacementModalProps> = ({
  team,
  isOpen,
  onClose,
  onSelectNewCaptain,
}) => {
  if (!isOpen) return null;

  const candidates = getCaptainReplacementCandidates(team);
  const [selectedId, setSelectedId] = useState<string>(candidates[0]?.id || '');

  const handleConfirm = () => {
    if (selectedId) {
      onSelectNewCaptain(team.id, selectedId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stadium-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-stadium-900 border border-stadium-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stadium-800 pb-3">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-gold-400" />
            <h3 className="font-extrabold text-white text-base">
              Change Captain — {team.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stadium-400 hover:text-white rounded-lg hover:bg-stadium-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-stadium-300">
          Select a replacement captain from the players currently on this team.
          <span className="block mt-1 font-semibold text-turf-400">
            Note: Player rosters will remain completely unchanged.
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {candidates.map((player) => {
            const isSelected = player.id === selectedId;
            return (
              <div
                key={player.id}
                onClick={() => setSelectedId(player.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-turf-950/80 border-turf-500 text-white shadow-md'
                    : 'bg-stadium-950/50 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white">{player.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {player.roles.map((r, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-stadium-800 text-stadium-400"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-turf-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-stadium-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stadium-700 text-stadium-300 font-bold text-xs hover:bg-stadium-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black text-xs shadow-lg shadow-turf-500/20 hover:brightness-110"
          >
            Update Captain
          </button>
        </div>
      </div>
    </div>
  );
};
