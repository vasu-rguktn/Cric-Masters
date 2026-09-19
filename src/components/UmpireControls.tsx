import React from 'react';
import type { MatchSession, MatchScorecard, PlayerMatchStat } from '../types/match';
import { saveMatchToHistory } from '../services/storageService';

interface UmpireControlsProps {
  currentMatch: MatchSession;
  setCurrentMatch: React.Dispatch<React.SetStateAction<MatchSession | null>>;
  scorecard: MatchScorecard;
}

export const UmpireControls: React.FC<UmpireControlsProps> = ({ currentMatch, setCurrentMatch, scorecard }) => {
  const battingTeamId = scorecard.battingTeamId || 'teamA';
  const currentInnings = scorecard.currentInnings || 1;

  const battingTeam = battingTeamId === 'teamA' ? currentMatch.teamA : currentMatch.teamB;
  const fieldingTeam = battingTeamId === 'teamA' ? currentMatch.teamB : currentMatch.teamA;
  const teamScoreKey = battingTeamId === 'teamA' ? 'teamAScore' : 'teamBScore';
  const opponentScoreKey = battingTeamId === 'teamA' ? 'teamBScore' : 'teamAScore';

  const setTotalOvers = (overs: number) => {
    setCurrentMatch({
      ...currentMatch,
      scorecard: { ...scorecard, totalOvers: overs, currentInnings: 1, battingTeamId: 'teamA' },
      updatedAt: new Date().toISOString(),
    });
  };

  if (!scorecard.totalOvers) {
    return (
      <div className="bg-stadium-900 rounded-2xl p-6 border border-turf-500/30 shadow-2xl mt-4 text-center">
        <h3 className="text-xl font-black text-white mb-4">Set Match Overs</h3>
        <p className="text-stadium-400 mb-6 text-sm">Please select the number of overs before starting the match.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[6, 7, 8, 10].map((overs) => (
            <button
              key={overs}
              onClick={() => setTotalOvers(overs)}
              className="px-6 py-3 bg-stadium-800 text-stadium-200 border border-stadium-600 rounded-xl font-black text-lg hover:bg-turf-500 hover:text-stadium-950 hover:border-turf-400 transition-all active:scale-95"
            >
              {overs} Overs
            </button>
          ))}
        </div>
      </div>
    );
  }

  const toggleDecisionPending = () => {
    setCurrentMatch({
      ...currentMatch,
      scorecard: { ...scorecard, isDecisionPending: !scorecard.isDecisionPending },
      updatedAt: new Date().toISOString(),
    });
  };

  const undoLastAction = () => {
    if (!scorecard.undoStack || scorecard.undoStack.length === 0) return;
    
    const stack = [...scorecard.undoStack];
    const previousStateString = stack.pop();
    if (!previousStateString) return;

    const previousState: MatchScorecard = JSON.parse(previousStateString);
    previousState.undoStack = stack;

    setCurrentMatch({
      ...currentMatch,
      scorecard: previousState,
      updatedAt: new Date().toISOString(),
    });
  };

  const getOrCreatePlayerStat = (playerId: string, teamId: 'teamA' | 'teamB', team: any, stats: Record<string, PlayerMatchStat>) => {
    if (!stats[playerId]) {
      const player = team?.players.find((p: any) => p.id === playerId);
      stats[playerId] = {
        playerId,
        playerName: player?.name || 'Unknown',
        teamId,
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        oversBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        dotBalls: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
      };
    }
    return stats[playerId];
  };

  const updateScore = (runs: number, wickets: number = 0, balls: number = 1) => {
    // Save current state for undo
    const stateString = JSON.stringify({ ...scorecard, undoStack: undefined });
    const currentStack = scorecard.undoStack ? [...scorecard.undoStack] : [];
    if (currentStack.length > 20) currentStack.shift();
    currentStack.push(stateString);

    let updatedScorecard = { ...scorecard, undoStack: currentStack };
    if (!updatedScorecard.playerStats) updatedScorecard.playerStats = {};
    
    // Update team score
    updatedScorecard[teamScoreKey] = {
      runs: updatedScorecard[teamScoreKey].runs + runs,
      wickets: updatedScorecard[teamScoreKey].wickets + wickets,
      overs: updatedScorecard[teamScoreKey].overs + balls,
    };

    // Update striker stats
    if (updatedScorecard.currentStrikerId) {
      const stats = getOrCreatePlayerStat(updatedScorecard.currentStrikerId, battingTeamId, battingTeam, updatedScorecard.playerStats);
      stats.runsScored += runs;
      stats.ballsFaced += balls;
      if (runs === 4) stats.fours += 1;
      if (runs === 6) stats.sixes += 1;
      if (runs === 0 && balls > 0 && wickets === 0) stats.dotBalls += 1;
    }

    // Update bowler stats
    if (updatedScorecard.currentBowlerId) {
      const fieldingTeamId = battingTeamId === 'teamA' ? 'teamB' : 'teamA';
      const stats = getOrCreatePlayerStat(updatedScorecard.currentBowlerId, fieldingTeamId, fieldingTeam, updatedScorecard.playerStats);
      stats.runsConceded += runs;
      stats.oversBowled += balls;
      stats.wicketsTaken += wickets;
    }

    // Check Innings End Constraints
    const totalBalls = updatedScorecard.totalOvers! * 6;
    const maxWickets = (battingTeam?.players.length || 11) - 1;
    const isAllOut = updatedScorecard[teamScoreKey].wickets >= maxWickets;
    const isOversFinished = updatedScorecard[teamScoreKey].overs >= totalBalls;
    
    const isTargetChased = currentInnings === 2 && updatedScorecard[teamScoreKey].runs > updatedScorecard[opponentScoreKey].runs;

    const isInningsOver = isAllOut || isOversFinished || isTargetChased;

    if (isInningsOver) {
      if (currentInnings === 1) {
        // Transition to Innings 2
        updatedScorecard.currentInnings = 2;
        updatedScorecard.battingTeamId = battingTeamId === 'teamA' ? 'teamB' : 'teamA';
        updatedScorecard.currentStrikerId = undefined;
        updatedScorecard.currentNonStrikerId = undefined;
        updatedScorecard.currentBowlerId = undefined;
        
        setCurrentMatch({
          ...currentMatch,
          scorecard: updatedScorecard,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Match is fully complete
        updatedScorecard.isCompleted = true;
        let winnerTeamId: 'teamA' | 'teamB' | 'TIE' | null = null;
        
        const teamARuns = updatedScorecard.teamAScore.runs;
        const teamBRuns = updatedScorecard.teamBScore.runs;
        
        if (teamARuns > teamBRuns) winnerTeamId = 'teamA';
        else if (teamBRuns > teamARuns) winnerTeamId = 'teamB';
        else winnerTeamId = 'TIE';

        const finalMatch = {
          ...currentMatch,
          scorecard: updatedScorecard,
          winnerTeamId,
          isLocked: true,
          updatedAt: new Date().toISOString(),
        };

        setCurrentMatch(finalMatch);
        saveMatchToHistory(finalMatch); // Auto-save match
      }
      return;
    }

    // Normal Strike Rotation
    const isOverComplete = balls > 0 && updatedScorecard[teamScoreKey].overs % 6 === 0;
    const isOddRun = runs % 2 !== 0;
    
    if (wickets > 0) {
      updatedScorecard.currentStrikerId = undefined;
    } else {
      const shouldSwap = (isOddRun && !isOverComplete) || (!isOddRun && isOverComplete);
      if (shouldSwap && updatedScorecard.currentStrikerId && updatedScorecard.currentNonStrikerId) {
        const temp = updatedScorecard.currentStrikerId;
        updatedScorecard.currentStrikerId = updatedScorecard.currentNonStrikerId;
        updatedScorecard.currentNonStrikerId = temp;
      }
    }

    // Bowler Rotation
    if (isOverComplete) {
      updatedScorecard.currentBowlerId = undefined;
    }

    setCurrentMatch({
      ...currentMatch,
      scorecard: updatedScorecard,
      updatedAt: new Date().toISOString(),
    });
  };

  if (scorecard.isDecisionPending) {
    return (
      <div className="bg-amber-900/40 rounded-2xl p-6 border border-amber-500/50 shadow-2xl mt-4 text-center">
        <h3 className="text-xl font-black text-amber-400 mb-4 animate-pulse">DECISION PENDING...</h3>
        <p className="text-amber-200/70 mb-6 text-sm">Please resolve the decision before continuing to score.</p>
        <button
          onClick={toggleDecisionPending}
          className="px-6 py-3 bg-amber-600 text-white border border-amber-500 rounded-xl font-black text-lg hover:bg-amber-500 transition-all active:scale-95"
        >
          Resolve Decision
        </button>
      </div>
    );
  }

  // Handle Missing Selections (Batters & Bowler)
  const isMissingBatters = !scorecard.currentStrikerId || !scorecard.currentNonStrikerId;
  const isMissingBowler = !scorecard.currentBowlerId;

  if (isMissingBatters || isMissingBowler) {
    const unselectedBatters = battingTeam?.players.filter(
      p => p.id !== scorecard.currentStrikerId && p.id !== scorecard.currentNonStrikerId
    ) || [];

    return (
      <div className="bg-stadium-900 rounded-2xl p-6 border border-turf-500/30 shadow-2xl mt-4">
        <h3 className="text-xl font-black text-white mb-4">Select Players</h3>
        
        {isMissingBatters && (
          <>
            {!scorecard.currentStrikerId && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-stadium-300 mb-2">Select Striker</label>
                <select
                  className="w-full bg-stadium-800 text-white p-3 rounded-lg border border-stadium-600 focus:border-turf-400 outline-none"
                  onChange={(e) => setCurrentMatch({ ...currentMatch, scorecard: { ...scorecard, currentStrikerId: e.target.value } })}
                  defaultValue=""
                >
                  <option value="" disabled>Select a player...</option>
                  {unselectedBatters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {scorecard.currentStrikerId && !scorecard.currentNonStrikerId && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-stadium-300 mb-2">Select Non-Striker</label>
                <select
                  className="w-full bg-stadium-800 text-white p-3 rounded-lg border border-stadium-600 focus:border-turf-400 outline-none"
                  onChange={(e) => setCurrentMatch({ ...currentMatch, scorecard: { ...scorecard, currentNonStrikerId: e.target.value } })}
                  defaultValue=""
                >
                  <option value="" disabled>Select a player...</option>
                  {unselectedBatters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {!isMissingBatters && isMissingBowler && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-stadium-300 mb-2">Select Next Bowler</label>
            <select
              className="w-full bg-stadium-800 text-white p-3 rounded-lg border border-stadium-600 focus:border-turf-400 outline-none"
              onChange={(e) => setCurrentMatch({ ...currentMatch, scorecard: { ...scorecard, currentBowlerId: e.target.value } })}
              defaultValue=""
            >
              <option value="" disabled>Select a player...</option>
              {fieldingTeam?.players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  const teamAName = currentMatch.teamA?.name || 'Team A';
  const teamBName = currentMatch.teamB?.name || 'Team B';
  const hasUndo = scorecard.undoStack && scorecard.undoStack.length > 0;
  
  const targetScore = currentInnings === 2 ? scorecard[opponentScoreKey].runs + 1 : null;

  return (
    <div className="bg-stadium-900 rounded-2xl p-4 border border-turf-500/30 shadow-2xl mt-4 relative">
      <div className="flex flex-col mb-4 border-b border-stadium-700 pb-3 gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-turf-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
            Umpire Controls
          </h3>
          <div className="flex gap-2">
            {hasUndo && (
              <button
                onClick={undoLastAction}
                className="text-xs font-bold text-stadium-950 bg-stadium-300 px-2 py-1 rounded-md hover:bg-stadium-200 transition-colors"
                title="Undo last action"
              >
                Undo
              </button>
            )}
            <button
              onClick={toggleDecisionPending}
              className="text-xs font-bold text-amber-900 bg-amber-500 px-2 py-1 rounded-md hover:bg-amber-400 transition-colors"
            >
              Decision Pending
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center bg-stadium-800 p-2 rounded-lg">
          <div className="text-sm font-bold text-stadium-300">
            Innings {currentInnings}
          </div>
          <div className="text-sm font-black text-turf-400">
            {battingTeamId === 'teamA' ? teamAName : teamBName} Batting
          </div>
        </div>
        
        {targetScore && (
          <div className="bg-stadium-950/50 p-2 rounded-lg text-center border border-stadium-700">
            <span className="text-xs text-stadium-400 uppercase font-bold tracking-widest">Target: </span>
            <span className="text-sm font-black text-gold-400">{targetScore} Runs</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[0, 1, 2, 3, 4, 6].map((run) => (
          <button
            key={run}
            onClick={() => updateScore(run)}
            className={`p-3 rounded-xl font-black text-lg shadow-sm border transition-transform active:scale-95 ${
              run === 4 || run === 6
                ? 'bg-gold-500 text-stadium-950 border-gold-400 hover:bg-gold-400'
                : 'bg-stadium-800 text-white border-stadium-700 hover:bg-stadium-700'
            }`}
          >
            {run}
          </button>
        ))}
        <button
          onClick={() => updateScore(0, 1)}
          className="col-span-2 p-3 bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl font-black text-lg hover:bg-red-500/30 active:scale-95"
        >
          Wicket
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => updateScore(0, 0, 0)}
          className="p-3 bg-stadium-800 text-stadium-200 border border-stadium-600 rounded-xl font-bold hover:bg-stadium-700 active:scale-95"
        >
          Wide (+0)
        </button>
        <button
          onClick={() => updateScore(0, 0, 0)}
          className="p-3 bg-stadium-800 text-stadium-200 border border-stadium-600 rounded-xl font-bold hover:bg-stadium-700 active:scale-95"
        >
          No Ball (+0)
        </button>
      </div>
    </div>
  );
};
