import React, { useState } from 'react';
import type { Team } from '../types/team';
import { CaptainReplacementModal } from './CaptainReplacementModal';
import { Crown, UserX, Users } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  onReplaceCaptain?: (teamId: 'teamA' | 'teamB', newCaptainId: string) => void;
  accentColor?: 'emerald' | 'amber';
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onReplaceCaptain,
  accentColor = 'emerald',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const captain = team.players.find((p) => p.id === team.captainId);
  const isCaptainPresent = captain?.isActive ?? true;

  const isEmerald = accentColor === 'emerald';

  const borderColor = isEmerald ? 'border-turf-500/40' : 'border-gold-500/40';
  const badgeBg = isEmerald ? 'bg-turf-500/20 text-turf-400 border-turf-500/40' : 'bg-gold-500/20 text-gold-400 border-gold-500/40';
  const teamTitleColor = isEmerald ? 'text-turf-400' : 'text-gold-400';

  const handleCaptainSelect = (newCaptainId: string) => {
    if (onReplaceCaptain) {
      onReplaceCaptain(team.id, newCaptainId);
    }
  };

  return (
    <>
      <div className={`bg-stadium-900 border ${borderColor} rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden`}>
        {/* Team Header */}
        <div className="flex items-center justify-between border-b border-stadium-800 pb-3">
          <div>
            <div className="text-[10px] font-black text-stadium-400 uppercase tracking-widest flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-stadium-400" />
              <span>{team.name.toUpperCase()} ({team.players.length} PLAYERS)</span>
            </div>
            <h3 className={`text-2xl font-black ${teamTitleColor} tracking-wider mt-0.5`}>
              {team.name}
            </h3>
          </div>

          {/* Captain Status Badge */}
          {captain && (
            <div className="flex flex-col items-end space-y-1">
              <div className={`px-3 py-1 rounded-full border ${badgeBg} font-extrabold text-xs flex items-center space-x-1 shadow-sm`}>
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>Captain: {captain.name}</span>
              </div>

              {!isCaptainPresent && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold rounded-lg border border-rose-500/40 transition-all flex items-center space-x-1"
                >
                  <UserX className="w-3 h-3" />
                  <span>Captain Absent (Replace)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Player Roster List */}
        <div className="space-y-2">
          <div className="text-[10px] font-black text-stadium-400 uppercase tracking-widest px-1">
            Player Roster
          </div>

          <div className="space-y-1.5">
            {team.players.map((player, idx) => {
              const isCap = player.id === team.captainId;
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between shadow-sm ${
                    isCap
                      ? 'bg-stadium-950 border-gold-500/50 shadow-gold-500/10'
                      : 'bg-stadium-950 border-stadium-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-black text-stadium-400 w-4 text-center">
                      {idx + 1}.
                    </span>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                        <span>{player.name}</span>
                        {isCap && (
                          <span className="px-2 py-0.2 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[9px] font-black uppercase">
                            CAPTAIN
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.roles.map((roleStr, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-stadium-800 text-stadium-300 font-semibold border border-stadium-700"
                          >
                            {roleStr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Change Captain Button */}
        {onReplaceCaptain && (
          <div className="pt-2 border-t border-stadium-800">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 text-xs font-extrabold rounded-xl border border-stadium-700 transition-all flex items-center justify-center space-x-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-gold-400" />
              <span>SWAP / CHANGE CAPTAIN FOR THIS TEAM</span>
            </button>
          </div>
        )}
      </div>

      {/* Isolated Single Team Captain Replacement Modal */}
      <CaptainReplacementModal
        team={team}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectNewCaptain={handleCaptainSelect}
      />
    </>
  );
};
