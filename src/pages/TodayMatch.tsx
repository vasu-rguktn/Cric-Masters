import React, { useState, useEffect } from 'react';
import type { Player } from '../types/player';
import type { MatchSession, TossOutcome, PlayerMatchStat, TeamScore } from '../types/match';
import { PlayerSelector } from '../components/PlayerSelector';
import { TeamCard } from '../components/TeamCard';
import { RoleSummary } from '../components/RoleSummary';
import { TossCoin } from '../components/TossCoin';
import { MatchCardModal } from '../components/MatchCardModal';
import { generateTeams } from '../algorithms/teamGenerator';
import { replaceCaptainInTeam } from '../algorithms/captainSelector';
import { getMatchHistory, saveMatchToHistory, saveCurrentMatch } from '../services/storageService';
import { syncMatchToSupabase } from '../services/supabaseService';
import { formatDateDisplay, getTodayIsoDate } from '../utils/dates';
import { shareOrCopyMatch } from '../utils/sharing';
import { calculatePlayerPerformance } from '../utils/performanceRating';
import { Play, RotateCw, Lock, Unlock, Share2, FileText, PlusCircle, Trophy, Award, Save } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayMatchProps {
  players: Player[];
  selectedPlayerIds: string[];
  setSelectedPlayerIds: (ids: string[]) => void;
  currentMatch: MatchSession | null;
  setCurrentMatch: (match: MatchSession | null) => void;
}

export const TodayMatch: React.FC<TodayMatchProps> = ({
  players,
  selectedPlayerIds,
  setSelectedPlayerIds,
  currentMatch,
  setCurrentMatch,
}) => {
  const [useJokerOption, setUseJokerOption] = useState<boolean>(false);
  const [isMatchCardOpen, setIsMatchCardOpen] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Scoreboard Inline States
  const [teamAScore, setTeamAScore] = useState<TeamScore>({ runs: 0, wickets: 0, overs: 0 });
  const [teamBScore, setTeamBScore] = useState<TeamScore>({ runs: 0, wickets: 0, overs: 0 });
  const [winnerTeamId, setWinnerTeamId] = useState<'teamA' | 'teamB' | 'TIE' | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerMatchStat>>({});
  const [showDetailedScorecard, setShowDetailedScorecard] = useState<boolean>(false);
  const [showStatsEntry, setShowStatsEntry] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const activePlayers = players.filter((p) => p.isActive);

  // Sync state when currentMatch changes
  useEffect(() => {
    if (currentMatch?.scorecard) {
      setTeamAScore(currentMatch.scorecard.teamAScore);
      setTeamBScore(currentMatch.scorecard.teamBScore);
      setPlayerStats(currentMatch.scorecard.playerStats || {});
      setWinnerTeamId(currentMatch.winnerTeamId || null);
    } else {
      setTeamAScore({ runs: 0, wickets: 0, overs: 0 });
      setTeamBScore({ runs: 0, wickets: 0, overs: 0 });
      setPlayerStats({});
      setWinnerTeamId(null);
    }
  }, [currentMatch]);

  const handleTogglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((pId) => pId !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPlayerIds(activePlayers.map((p) => p.id));
  };

  const handleClearAll = () => {
    setSelectedPlayerIds([]);
  };

  const handleSelectYesterday = (ids: string[]) => {
    const validIds = ids.filter((id) => activePlayers.some((p) => p.id === id));
    setSelectedPlayerIds(validIds);
  };

  const handleMakeTeams = () => {
    const available = activePlayers.filter((p) => selectedPlayerIds.includes(p.id));
    if (available.length < 4) {
      alert('Please select at least 4 available players.');
      return;
    }

    const history = getMatchHistory();
    const result = generateTeams(available, history, useJokerOption);

    const matchDate = currentMatch?.date || getTodayIsoDate();
    const newMatch: MatchSession = {
      id: currentMatch?.id || 'match-' + Date.now(),
      date: matchDate,
      availablePlayerIds: selectedPlayerIds,
      teamA: result.teamA,
      teamB: result.teamB,
      joker: result.joker || null,
      limitations: result.limitations,
      isLocked: false,
      tossResult: currentMatch?.tossResult || null,
      winnerTeamId: null,
      createdAt: currentMatch?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentMatch(newMatch);
    saveCurrentMatch(newMatch);
    saveMatchToHistory(newMatch);
    syncMatchToSupabase(newMatch);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleRegenerateTeams = () => {
    if (currentMatch?.isLocked) {
      alert('Teams are currently locked. Unlock teams first to regenerate.');
      return;
    }
    handleMakeTeams();
  };

  const handleReplaceCaptain = (teamId: 'teamA' | 'teamB', newCaptainId: string) => {
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;

    let updatedTeamA = currentMatch.teamA;
    let updatedTeamB = currentMatch.teamB;

    if (teamId === 'teamA') {
      updatedTeamA = replaceCaptainInTeam(currentMatch.teamA, newCaptainId);
    } else {
      updatedTeamB = replaceCaptainInTeam(currentMatch.teamB, newCaptainId);
    }

    const updatedMatch: MatchSession = {
      ...currentMatch,
      teamA: updatedTeamA,
      teamB: updatedTeamB,
      updatedAt: new Date().toISOString(),
    };

    setCurrentMatch(updatedMatch);
    saveCurrentMatch(updatedMatch);
    saveMatchToHistory(updatedMatch);
    syncMatchToSupabase(updatedMatch);
  };

  const handleToggleLock = () => {
    if (!currentMatch) return;
    const updatedMatch: MatchSession = {
      ...currentMatch,
      isLocked: !currentMatch.isLocked,
      updatedAt: new Date().toISOString(),
    };
    setCurrentMatch(updatedMatch);
    saveCurrentMatch(updatedMatch);
    saveMatchToHistory(updatedMatch);
    syncMatchToSupabase(updatedMatch);
  };

  const handleTossComplete = (outcome: TossOutcome) => {
    if (!currentMatch) return;
    const updatedMatch: MatchSession = {
      ...currentMatch,
      tossResult: outcome,
      updatedAt: new Date().toISOString(),
    };
    setCurrentMatch(updatedMatch);
    saveCurrentMatch(updatedMatch);
    saveMatchToHistory(updatedMatch);
    syncMatchToSupabase(updatedMatch);
  };

  const handleShareTeams = async () => {
    if (!currentMatch) return;
    const res = await shareOrCopyMatch(currentMatch);
    if (res === 'copied') {
      setShareFeedback('Teams copied to clipboard!');
    } else if (res === 'shared') {
      setShareFeedback('Teams shared!');
    }
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleStartNewMatch = () => {
    if (confirm('Start a new match for today? Current team view will reset, but past matches remain saved in history.')) {
      const freshDate = getTodayIsoDate();
      const freshMatch: MatchSession = {
        id: 'match-' + Date.now(),
        date: freshDate,
        availablePlayerIds: selectedPlayerIds,
        teamA: null,
        teamB: null,
        joker: null,
        limitations: [],
        isLocked: false,
        tossResult: null,
        winnerTeamId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentMatch(freshMatch);
      saveCurrentMatch(freshMatch);
    }
  };

  const handleUpdatePlayerStat = (playerId: string, field: keyof PlayerMatchStat, value: number) => {
    if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) return;

    const teamId = currentMatch.teamA.players.some((p) => p.id === playerId) ? 'teamA' : 'teamB';
    const player = [...currentMatch.teamA.players, ...currentMatch.teamB.players].find((p) => p.id === playerId);
    if (!player) return;

    const existing = playerStats[playerId] || {
      playerId,
      playerName: player.name,
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

    const updatedStat = {
      ...existing,
      [field]: value,
    };

    const rating = calculatePlayerPerformance(updatedStat);
    updatedStat.impactScore = rating.impactScore;
    updatedStat.certification = rating.certifications[0] || undefined;

    setPlayerStats({
      ...playerStats,
      [playerId]: updatedStat,
    });
  };

  const handleSaveScoreboard = () => {
    if (!currentMatch) return;

    let highestScore = -Infinity;
    let momId: string | undefined = undefined;

    Object.values(playerStats).forEach((stat) => {
      const rating = calculatePlayerPerformance(stat);
      if (rating.impactScore > highestScore && rating.impactScore > 10) {
        highestScore = rating.impactScore;
        momId = stat.playerId;
      }
    });

    const scorecard = {
      teamAScore,
      teamBScore,
      playerStats,
      momPlayerId: momId,
      isCompleted: true,
    };

    const updatedMatch: MatchSession = {
      ...currentMatch,
      scorecard,
      winnerTeamId,
      updatedAt: new Date().toISOString(),
    };

    setCurrentMatch(updatedMatch);
    saveCurrentMatch(updatedMatch);
    saveMatchToHistory(updatedMatch);
    syncMatchToSupabase(updatedMatch);

    setSaveMessage('Scoreboard & player statistics updated!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const allPlayers = currentMatch && currentMatch.teamA && currentMatch.teamB
    ? [...currentMatch.teamA.players, ...currentMatch.teamB.players]
    : [];

  const certifiedStats = Object.values(playerStats)
    .map((s) => ({ ...s, rating: calculatePlayerPerformance(s) }))
    .sort((a, b) => b.rating.impactScore - a.rating.impactScore);

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-4">
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 flex items-center justify-between shadow-md">
        <div>
          <div className="text-[10px] font-black uppercase text-turf-400 tracking-widest">
            DAILY MATCH SESSION
          </div>
          <div className="text-lg font-black text-white">
            {formatDateDisplay(currentMatch?.date)}
          </div>
        </div>

        <button
          onClick={handleStartNewMatch}
          className="px-3 py-1.5 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 rounded-xl text-xs font-bold border border-stadium-700 transition-all flex items-center space-x-1"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>NEW MATCH</span>
        </button>
      </div>

      <div className="space-y-3">
        <PlayerSelector
          players={players}
          selectedIds={selectedPlayerIds}
          onTogglePlayer={handleTogglePlayer}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onSelectYesterday={handleSelectYesterday}
        />

        {selectedPlayerIds.length % 2 !== 0 && selectedPlayerIds.length >= 5 && (
          <div className="bg-stadium-900/60 border border-stadium-800 rounded-2xl p-3 flex items-center justify-between text-xs">
            <span className="text-stadium-300">
              Odd player count ({selectedPlayerIds.length}): Assign 1 Joker?
            </span>
            <button
              onClick={() => setUseJokerOption(!useJokerOption)}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                useJokerOption
                  ? 'bg-gold-500 text-stadium-950 shadow-md'
                  : 'bg-stadium-800 text-stadium-400 border border-stadium-700'
              }`}
            >
              {useJokerOption ? 'JOKER ON' : 'PREFER NEAR-EQUAL'}
            </button>
          </div>
        )}

        <button
          onClick={handleMakeTeams}
          disabled={selectedPlayerIds.length < 4}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-lg tracking-wider shadow-xl shadow-turf-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>MAKE TEAMS</span>
        </button>
      </div>

      {currentMatch && currentMatch.teamA && currentMatch.teamB && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-stadium-900 border border-stadium-800 rounded-2xl p-2.5 flex items-center justify-between gap-1 text-xs">
            <button
              onClick={handleToggleLock}
              className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                currentMatch.isLocked
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-stadium-800 text-stadium-300 border border-stadium-700 hover:bg-stadium-700'
              }`}
            >
              {currentMatch.isLocked ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>LOCKED</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-stadium-400" />
                  <span>LOCK TEAMS</span>
                </>
              )}
            </button>

            <button
              onClick={handleRegenerateTeams}
              disabled={currentMatch.isLocked}
              className="px-3 py-2 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 rounded-xl font-bold border border-stadium-700 transition-all flex items-center space-x-1 disabled:opacity-40"
            >
              <RotateCw className="w-4 h-4 text-turf-400" />
              <span>REGENERATE</span>
            </button>

            <button
              onClick={handleShareTeams}
              className="px-3 py-2 bg-turf-500 hover:bg-turf-600 text-stadium-950 rounded-xl font-black shadow-md transition-all flex items-center space-x-1"
            >
              <Share2 className="w-4 h-4" />
              <span>SHARE</span>
            </button>

            <button
              onClick={() => setIsMatchCardOpen(true)}
              className="p-2 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 rounded-xl border border-stadium-700 transition-all flex-1 text-center font-bold flex items-center justify-center space-x-1"
              title="View Printable Match Card"
            >
              <FileText className="w-4 h-4 text-gold-400" />
              <span className="text-[10px]">CARD</span>
            </button>
          </div>

          {shareFeedback && (
            <div className="p-2 bg-turf-500/20 border border-turf-500/40 rounded-xl text-center text-xs font-bold text-turf-300">
              {shareFeedback}
            </div>
          )}

          {currentMatch.joker && (
            <div className="bg-gradient-to-r from-gold-500/20 via-stadium-900 to-gold-500/20 border border-gold-500/40 rounded-2xl p-3 text-center space-y-1 shadow-md">
              <div className="text-[10px] font-black uppercase text-gold-400 tracking-widest">
                JOKER / EXTRA PLAYER
              </div>
              <div className="text-lg font-black text-white">{currentMatch.joker.name}</div>
              <div className="text-xs text-stadium-300">
                Plays for both teams or replaces missing fielder as needed.
              </div>
            </div>
          )}

          <div className="space-y-4">
            <TeamCard
              team={currentMatch.teamA}
              onReplaceCaptain={handleReplaceCaptain}
              accentColor="emerald"
            />
            <TeamCard
              team={currentMatch.teamB}
              onReplaceCaptain={handleReplaceCaptain}
              accentColor="amber"
            />
          </div>

          <RoleSummary
            teamA={currentMatch.teamA}
            teamB={currentMatch.teamB}
            balanceScore={currentMatch.teamA.roleSummary.strengthScore}
            limitations={currentMatch.limitations}
          />

          {/* TOSS SECTION */}
          <div className="pt-4 border-t border-stadium-800 space-y-2">
            <div className="text-xs font-bold text-stadium-400 uppercase tracking-wider px-1">
              Ground Toss
            </div>
            <TossCoin onTossComplete={handleTossComplete} />
          </div>

          {/* INLINE MATCH SCOREBOARD & STATS SECTION */}
          <div className="pt-4 border-t border-stadium-800 space-y-4">
            <div className="bg-gradient-to-br from-stadium-900 to-stadium-950 border border-gold-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stadium-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-gold-400" />
                  <h3 className="font-extrabold text-white text-base tracking-wider">
                    MATCH SCOREBOARD & RATINGS
                  </h3>
                </div>
                <span className="text-[10px] text-turf-400 font-extrabold uppercase">
                  Ground Entry
                </span>
              </div>

              {saveMessage && (
                <div className="p-2.5 bg-turf-500/20 border border-turf-500/40 rounded-xl text-center text-xs font-bold text-turf-400 flex items-center justify-center space-x-1">
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* Team Scores Input Boxes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stadium-900 p-3 rounded-2xl border border-turf-500/30 space-y-2">
                  <span className="font-extrabold text-turf-400 block truncate">{currentMatch.teamA.name} Score</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      placeholder="Runs"
                      value={teamAScore.runs || ''}
                      onChange={(e) => setTeamAScore({ ...teamAScore, runs: Number(e.target.value) })}
                      className="w-full bg-stadium-950 border border-stadium-700 rounded-lg p-2 font-black text-center text-white"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="Wickets"
                      value={teamAScore.wickets || ''}
                      onChange={(e) => setTeamAScore({ ...teamAScore, wickets: Number(e.target.value) })}
                      className="w-full bg-stadium-950 border border-stadium-700 rounded-lg p-2 font-black text-center text-white"
                    />
                  </div>
                </div>

                <div className="bg-stadium-900 p-3 rounded-2xl border border-gold-500/30 space-y-2">
                  <span className="font-extrabold text-gold-400 block truncate">{currentMatch.teamB.name} Score</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      placeholder="Runs"
                      value={teamBScore.runs || ''}
                      onChange={(e) => setTeamBScore({ ...teamBScore, runs: Number(e.target.value) })}
                      className="w-full bg-stadium-950 border border-stadium-700 rounded-lg p-2 font-black text-center text-white"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="Wickets"
                      value={teamBScore.wickets || ''}
                      onChange={(e) => setTeamBScore({ ...teamBScore, wickets: Number(e.target.value) })}
                      className="w-full bg-stadium-950 border border-stadium-700 rounded-lg p-2 font-black text-center text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Match Winner Declaration */}
              <div className="bg-stadium-900 p-3 rounded-2xl border border-stadium-850 space-y-2">
                <span className="text-[10px] font-black text-stadium-400 uppercase tracking-widest block">Declare Winner</span>
                <select
                  value={winnerTeamId || ''}
                  onChange={(e) => setWinnerTeamId((e.target.value as any) || null)}
                  className="w-full bg-stadium-950 border border-stadium-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                >
                  <option value="">-- No Winner Declared yet --</option>
                  <option value="teamA">{currentMatch.teamA.name}</option>
                  <option value="teamB">{currentMatch.teamB.name}</option>
                  <option value="TIE">Match Tied (TIE)</option>
                </select>
              </div>

              {/* Toggle Roster Player Stat Inputs */}
              <button
                onClick={() => setShowStatsEntry(!showStatsEntry)}
                className="w-full py-2.5 bg-stadium-800 hover:bg-stadium-700 text-stadium-100 rounded-xl text-xs font-black border border-stadium-700 flex items-center justify-center space-x-1.5"
              >
                <span>{showStatsEntry ? '▲ HIDE INDIVIDUAL STATS INPUT' : '▼ ADD/EDIT INDIVIDUAL PLAYER STATS'}</span>
              </button>

              {showStatsEntry && allPlayers.length > 0 && (
                <div className="space-y-3 animate-fade-in pr-1 max-h-[350px] overflow-y-auto">
                  {allPlayers.map((player) => {
                    const stat = playerStats[player.id] || { runsScored: 0, ballsFaced: 0, wicketsTaken: 0, dotBalls: 0, catches: 0 };
                    return (
                      <div key={player.id} className="bg-stadium-950 border border-stadium-800 rounded-2xl p-3 space-y-2">
                        <div className="font-extrabold text-xs text-white">{player.name}</div>
                        <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                          <div>
                            <span className="text-stadium-400 block mb-0.5 text-center">Runs</span>
                            <input
                              type="number"
                              value={stat.runsScored || ''}
                              onChange={(e) => handleUpdatePlayerStat(player.id, 'runsScored', Number(e.target.value))}
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-stadium-400 block mb-0.5 text-center">Balls</span>
                            <input
                              type="number"
                              value={stat.ballsFaced || ''}
                              onChange={(e) => handleUpdatePlayerStat(player.id, 'ballsFaced', Number(e.target.value))}
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-stadium-400 block mb-0.5 text-center">Wkts</span>
                            <input
                              type="number"
                              value={stat.wicketsTaken || ''}
                              onChange={(e) => handleUpdatePlayerStat(player.id, 'wicketsTaken', Number(e.target.value))}
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-stadium-400 block mb-0.5 text-center">Dots</span>
                            <input
                              type="number"
                              value={stat.dotBalls || ''}
                              onChange={(e) => handleUpdatePlayerStat(player.id, 'dotBalls', Number(e.target.value))}
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-stadium-400 block mb-0.5 text-center">Ctch</span>
                            <input
                              type="number"
                              value={stat.catches || ''}
                              onChange={(e) => handleUpdatePlayerStat(player.id, 'catches', Number(e.target.value))}
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View Completed Scorecard */}
              <button
                onClick={() => setShowDetailedScorecard(!showDetailedScorecard)}
                className="w-full py-2 bg-stadium-850 hover:bg-stadium-800 text-stadium-200 rounded-xl text-[11px] font-bold border border-stadium-800"
              >
                {showDetailedScorecard ? '▲ Hide Scoreboard View' : '▼ View Full Scoreboard Breakdown'}
              </button>

              {showDetailedScorecard && (
                <div className="space-y-4 pt-2 border-t border-stadium-800 animate-fade-in text-xs">
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-turf-400 uppercase">{currentMatch.teamA.name} Players</span>
                    <div className="bg-stadium-950 p-2.5 rounded-xl border border-stadium-800 space-y-1">
                      {currentMatch.teamA.players.map((player) => {
                        const stat = playerStats[player.id];
                        return (
                          <div key={player.id} className="py-1 border-b border-stadium-900/60 last:border-b-0 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-white">{player.name}</span>
                            {stat ? (
                              <span className="text-stadium-300">
                                {stat.runsScored}r ({stat.ballsFaced}b) | {stat.wicketsTaken}w ({stat.dotBalls}d)
                              </span>
                            ) : (
                              <span className="text-stadium-600">No stats</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-extrabold text-gold-400 uppercase">{currentMatch.teamB.name} Players</span>
                    <div className="bg-stadium-950 p-2.5 rounded-xl border border-stadium-800 space-y-1">
                      {currentMatch.teamB.players.map((player) => {
                        const stat = playerStats[player.id];
                        return (
                          <div key={player.id} className="py-1 border-b border-stadium-900/60 last:border-b-0 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-white">{player.name}</span>
                            {stat ? (
                              <span className="text-stadium-300">
                                {stat.runsScored}r ({stat.ballsFaced}b) | {stat.wicketsTaken}w ({stat.dotBalls}d)
                              </span>
                            ) : (
                              <span className="text-stadium-600">No stats</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SAVE / UPDATE BUTTON */}
              <button
                onClick={handleSaveScoreboard}
                className="w-full py-3 bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>SAVE MATCH SCOREBOARD & RATINGS</span>
              </button>

              {/* Certified top performers list */}
              {certifiedStats.length > 0 && (
                <div className="pt-2 border-t border-stadium-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-stadium-400 uppercase tracking-wider">
                    Today's Certified Top Performers
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {certifiedStats.slice(0, 3).map((stat) => (
                      <span
                        key={stat.playerId}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-turf-500/20 text-turf-400 font-bold border border-turf-500/30 flex items-center space-x-1"
                      >
                        <Award className="w-3 h-3 text-gold-400" />
                        <span>
                          {stat.playerName}: {stat.rating.impactScore} pts ({stat.rating.certifications[0] || 'Top Performer'})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentMatch && (
        <MatchCardModal
          match={currentMatch}
          isOpen={isMatchCardOpen}
          onClose={() => setIsMatchCardOpen(false)}
        />
      )}
    </div>
  );
};
