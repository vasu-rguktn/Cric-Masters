import React, { useState } from 'react';
import type { MatchSession } from '../types/match';
import { UmpireControls } from '../components/UmpireControls';

interface ScoreboardPageProps {
  currentMatch: MatchSession | null;
  setCurrentMatch: React.Dispatch<React.SetStateAction<MatchSession | null>>;
}

export const ScoreboardPage: React.FC<ScoreboardPageProps> = ({ currentMatch, setCurrentMatch }) => {
  const [isUmpireMode, setIsUmpireMode] = useState(false);

  if (!currentMatch) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-stadium-400">No active match found.</p>
        <p className="text-sm mt-2">Go to the Today tab to generate teams.</p>
      </div>
    );
  }

  const scorecard = currentMatch.scorecard || {
    teamAScore: { runs: 0, wickets: 0, overs: 0 }, // Note: overs here is ball count
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    playerStats: {},
    isCompleted: false,
  };

  const teamAName = currentMatch.teamA?.name || 'Team A';
  const teamBName = currentMatch.teamB?.name || 'Team B';

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainder = balls % 6;
    return `${overs}.${remainder}`;
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white">Scoreboard</h2>
        <button
          onClick={() => setIsUmpireMode(!isUmpireMode)}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
            isUmpireMode ? 'bg-turf-500 text-stadium-950' : 'bg-stadium-800 text-stadium-200 border border-stadium-700'
          }`}
        >
          {isUmpireMode ? 'Exit Umpire Mode' : 'Umpire Mode'}
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-stadium-800/80 rounded-2xl p-5 border border-stadium-700/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
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
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
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

      {(scorecard.currentStrikerId || scorecard.currentNonStrikerId) && (
        <div className="bg-stadium-800/80 rounded-2xl p-4 border border-stadium-700/50 shadow-xl mb-6">
          <h3 className="text-xs font-bold text-stadium-400 mb-3 uppercase tracking-wider">At The Crease</h3>
          
          {scorecard.currentStrikerId && (
            <div className="flex justify-between items-center text-white mb-2 bg-stadium-900/50 p-2 rounded-lg border border-turf-500/30">
              <div className="flex items-center space-x-2">
                <span className="text-turf-400 text-xs animate-pulse">▶</span>
                <span className="font-bold">
                  {scorecard.playerStats[scorecard.currentStrikerId]?.playerName || 
                   currentMatch.teamA?.players.find(p => p.id === scorecard.currentStrikerId)?.name || 
                   currentMatch.teamB?.players.find(p => p.id === scorecard.currentStrikerId)?.name || 'Striker'}
                </span>
              </div>
              <div className="text-sm font-black flex items-baseline space-x-1">
                <span>{scorecard.playerStats[scorecard.currentStrikerId]?.runsScored || 0}</span>
                <span className="text-xs text-stadium-400 font-medium">({scorecard.playerStats[scorecard.currentStrikerId]?.ballsFaced || 0})</span>
              </div>
            </div>
          )}

          {scorecard.currentNonStrikerId && (
            <div className="flex justify-between items-center text-stadium-200 p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-transparent text-xs">▶</span>
                <span className="font-semibold">
                  {scorecard.playerStats[scorecard.currentNonStrikerId]?.playerName || 
                   currentMatch.teamA?.players.find(p => p.id === scorecard.currentNonStrikerId)?.name || 
                   currentMatch.teamB?.players.find(p => p.id === scorecard.currentNonStrikerId)?.name || 'Non-Striker'}
                </span>
              </div>
              <div className="text-sm font-bold flex items-baseline space-x-1">
                <span>{scorecard.playerStats[scorecard.currentNonStrikerId]?.runsScored || 0}</span>
                <span className="text-xs text-stadium-400 font-medium">({scorecard.playerStats[scorecard.currentNonStrikerId]?.ballsFaced || 0})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {scorecard.currentBowlerId && (
        <div className="bg-stadium-800/80 rounded-2xl p-4 border border-stadium-700/50 shadow-xl mb-6">
          <h3 className="text-xs font-bold text-stadium-400 mb-3 uppercase tracking-wider">Bowling</h3>
          <div className="flex justify-between items-center text-white bg-stadium-900/50 p-2 rounded-lg border border-red-500/30">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-xs">⚽</span>
              <span className="font-bold">
                {scorecard.playerStats[scorecard.currentBowlerId]?.playerName || 
                 currentMatch.teamA?.players.find(p => p.id === scorecard.currentBowlerId)?.name || 
                 currentMatch.teamB?.players.find(p => p.id === scorecard.currentBowlerId)?.name || 'Bowler'}
              </span>
            </div>
            <div className="text-xs font-medium text-stadium-300 flex items-center space-x-3">
              <span>{Math.floor((scorecard.playerStats[scorecard.currentBowlerId]?.oversBowled || 0) / 6)}.{((scorecard.playerStats[scorecard.currentBowlerId]?.oversBowled || 0) % 6)} Overs</span>
              <span>{scorecard.playerStats[scorecard.currentBowlerId]?.runsConceded || 0} Runs</span>
              <span className="font-bold text-white">{scorecard.playerStats[scorecard.currentBowlerId]?.wicketsTaken || 0} W</span>
            </div>
          </div>
        </div>
      )}

      {scorecard.isCompleted ? (
        <div className="bg-stadium-900/90 rounded-3xl p-6 border-2 border-turf-500 shadow-2xl text-center space-y-4 mb-6">
          <h2 className="text-2xl font-black text-white">MATCH COMPLETED</h2>
          <div className="text-lg font-bold text-stadium-300">
            {currentMatch.winnerTeamId === 'TIE' 
              ? "It's a Tie!" 
              : `${currentMatch.winnerTeamId === 'teamA' ? teamAName : teamBName} Won!`}
          </div>
          <p className="text-xs text-stadium-400">This match has been saved to history.</p>
        </div>
      ) : (
        isUmpireMode && (
          <UmpireControls
            currentMatch={currentMatch}
            setCurrentMatch={setCurrentMatch}
            scorecard={scorecard}
          />
        )
      )}
    </div>
  );
};
