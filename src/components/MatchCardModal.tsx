import React from 'react';
import type { MatchSession } from '../types/match';
import { formatDateDisplay } from '../utils/dates';
import { shareOrCopyMatch } from '../utils/sharing';
import { X, Share2, Trophy, CheckCircle2 } from 'lucide-react';

interface MatchCardModalProps {
  match: MatchSession;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchCardModal: React.FC<MatchCardModalProps> = ({
  match,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !match.teamA || !match.teamB) return null;

  const [shareStatus, setShareStatus] = React.useState<string | null>(null);

  const handleShare = async () => {
    const res = await shareOrCopyMatch(match);
    if (res === 'copied') {
      setShareStatus('Copied to clipboard!');
    } else if (res === 'shared') {
      setShareStatus('Shared successfully!');
    }
    setTimeout(() => setShareStatus(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stadium-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-stadium-900 border border-stadium-700 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-stadium-800 pb-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-gold-400" />
            <h3 className="font-extrabold text-white text-base">MATCH CARD</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stadium-400 hover:text-white rounded-lg hover:bg-stadium-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gradient-to-b from-stadium-950 to-stadium-900 border border-turf-500/30 rounded-2xl p-4 space-y-4 shadow-inner">
          <div className="flex items-center justify-center space-x-3 text-center border-b border-stadium-800 pb-3">
            <img
              src="./cric.png"
              alt="Cric Masters Logo"
              className="w-12 h-12 object-contain drop-shadow"
            />
            <div className="text-left">
              <div className="text-lg font-black text-white tracking-widest leading-none">
                CRIC MASTERS
              </div>
              <div className="text-xs text-turf-400 font-bold tracking-wider mt-1">
                {formatDateDisplay(match.date)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stadium-900/80 border border-turf-500/30 rounded-xl p-3 space-y-2">
              <div className="text-center font-black text-sm text-turf-400 border-b border-stadium-800 pb-1 line-clamp-1">
                {match.teamA.name}
              </div>
              <div className="space-y-1 text-xs text-stadium-200">
                {match.teamA.players.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span>
                      {idx + 1}. {p.name}
                    </span>
                    {p.id === match.teamA?.captainId && (
                      <span className="text-[8px] font-bold bg-gold-500/20 text-gold-400 px-1 rounded">
                        (C)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stadium-900/80 border border-gold-500/30 rounded-xl p-3 space-y-2">
              <div className="text-center font-black text-sm text-gold-400 border-b border-stadium-800 pb-1 line-clamp-1">
                {match.teamB.name}
              </div>
              <div className="space-y-1 text-xs text-stadium-200">
                {match.teamB.players.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span>
                      {idx + 1}. {p.name}
                    </span>
                    {p.id === match.teamB?.captainId && (
                      <span className="text-[8px] font-bold bg-gold-500/20 text-gold-400 px-1 rounded">
                        (C)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-stadium-900 p-2.5 rounded-xl border border-stadium-800 text-xs flex flex-wrap items-center justify-around gap-2 text-stadium-300">
            {match.joker && (
              <div>
                <span className="text-stadium-400">Joker:</span>{' '}
                <span className="font-bold text-white">{match.joker.name}</span>
              </div>
            )}
            {match.tossResult && (
              <div>
                <span className="text-stadium-400">Toss:</span>{' '}
                <span className="font-bold text-turf-400">{match.tossResult}</span>
              </div>
            )}
          </div>
        </div>

        {shareStatus && (
          <div className="p-2 bg-turf-500/20 border border-turf-500/40 rounded-xl text-center text-xs font-bold text-turf-300 flex items-center justify-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-turf-400" />
            <span>{shareStatus}</span>
          </div>
        )}

        <div className="flex items-center space-x-2 pt-2 border-t border-stadium-800">
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black text-xs shadow-lg shadow-turf-500/20 hover:brightness-110 flex items-center justify-center space-x-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>SHARE TEAMS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
