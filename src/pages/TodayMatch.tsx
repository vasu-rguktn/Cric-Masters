import React, { useState, useEffect, useCallback } from 'react';
import type { Player } from '../types/player';
import type { MatchSession, TossOutcome, PlayerMatchStat, TeamScore } from '../types/match';
import { PlayerSelector } from '../components/PlayerSelector';
import { TeamCard } from '../components/TeamCard';
import { RoleSummary } from '../components/RoleSummary';
import { TossCoin } from '../components/TossCoin';
import { MatchCardModal } from '../components/MatchCardModal';
import { generateTeams } from '../algorithms/teamGenerator';
import { replaceCaptainInTeam } from '../algorithms/captainSelector';
import {
  getMatchHistory,
  saveMatchToHistory,
  saveCurrentMatch,
  getTodayMatchesByDate,
} from '../services/storageService';
import {
  syncMatchToSupabase,
  fetchTodayMatchesFromSupabase,
  subscribeToMatchUpdates,
} from '../services/supabaseService';
import { formatDateDisplay, getTodayIsoDate } from '../utils/dates';
import { shareOrCopyMatch, copyMatchDirectLink } from '../utils/sharing';
import { calculatePlayerPerformance } from '../utils/performanceRating';
import {
  Play,
  RotateCw,
  Lock,
  Unlock,
  Share2,
  FileText,
  PlusCircle,
  Trophy,
  Save,
  RefreshCw,
  Copy,
  Zap,
  UserCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
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
  const [activeMatchNumber, setActiveMatchNumber] = useState<1 | 2>(1);
  const [useJokerOption] = useState<boolean>(false);
  const [isMatchCardOpen, setIsMatchCardOpen] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isPlayerSelectorExpanded, setIsPlayerSelectorExpanded] = useState<boolean>(false);

  const isPlayerSelectionInitializedRef = React.useRef<boolean>(false);
  const prevActiveMatchNumRef = React.useRef<1 | 2>(activeMatchNumber);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<string>('Live Synced');

  // Match 1 and Match 2 local states
  const [match1, setMatch1] = useState<MatchSession | null>(null);
  const [match2, setMatch2] = useState<MatchSession | null>(null);

  // Scoreboard Inline States
  const [teamAScore, setTeamAScore] = useState<TeamScore>({ runs: 0, wickets: 0, overs: 0 });
  const [teamBScore, setTeamBScore] = useState<TeamScore>({ runs: 0, wickets: 0, overs: 0 });
  const [winnerTeamId, setWinnerTeamId] = useState<'teamA' | 'teamB' | 'TIE' | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerMatchStat>>({});
  const [showStatsEntry, setShowStatsEntry] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const activePlayers = players.filter((p) => p.isActive);
  const todayStr = currentMatch?.date || getTodayIsoDate();

  // Load matches from local storage & Supabase
  const loadMatches = useCallback(
    async (silent: boolean = false) => {
      if (!silent) setIsSyncing(true);

      const localMatches = getTodayMatchesByDate(todayStr);
      let m1 = localMatches.match1;
      let m2 = localMatches.match2;

      // Try fetching from cloud for zero-login multi-device sync
      try {
        const cloudMatches = await fetchTodayMatchesFromSupabase(todayStr);
        if (cloudMatches && cloudMatches.length > 0) {
          const cloudM1 = cloudMatches.find((m) => m.matchNumber === 1) || null;
          const cloudM2 = cloudMatches.find((m) => m.matchNumber === 2) || null;

          if (cloudM1) {
            if (!m1 || new Date(cloudM1.updatedAt) > new Date(m1.updatedAt)) {
              m1 = cloudM1;
              saveMatchToHistory(cloudM1);
            }
          }
          if (cloudM2) {
            if (!m2 || new Date(cloudM2.updatedAt) > new Date(m2.updatedAt)) {
              m2 = cloudM2;
              saveMatchToHistory(cloudM2);
            }
          }
        }
      } catch (e) {
        // use local
      }

      setMatch1(m1);
      setMatch2(m2);

      const active = activeMatchNumber === 1 ? m1 : m2;
      if (active) {
        setCurrentMatch(active);
        saveCurrentMatch(active);

        // Only set selectedPlayerIds from active match on initial load OR explicit active match number change
        const matchSwitched = prevActiveMatchNumRef.current !== activeMatchNumber;
        if (!isPlayerSelectionInitializedRef.current || matchSwitched) {
          if (active.availablePlayerIds && active.availablePlayerIds.length > 0) {
            setSelectedPlayerIds(active.availablePlayerIds);
          }
          isPlayerSelectionInitializedRef.current = true;
          prevActiveMatchNumRef.current = activeMatchNumber;
        }
      }

      setLastSyncTime(new Date());
      setSyncStatus('Live Synced');
      if (!silent) setIsSyncing(false);
    },
    [todayStr, activeMatchNumber, setCurrentMatch, setSelectedPlayerIds]
  );

  // Initial load and Realtime sync subscription
  useEffect(() => {
    loadMatches();

    // Subscribe to cloud / broadcast updates
    const unsubscribe = subscribeToMatchUpdates(todayStr, (updatedMatch) => {
      if (updatedMatch.matchNumber === 2) {
        setMatch2(updatedMatch);
      } else {
        setMatch1(updatedMatch);
      }

      if (
        (activeMatchNumber === 1 && (updatedMatch.matchNumber === 1 || !updatedMatch.matchNumber)) ||
        (activeMatchNumber === 2 && updatedMatch.matchNumber === 2)
      ) {
        setCurrentMatch(updatedMatch);
        saveCurrentMatch(updatedMatch);
      }

      setLastSyncTime(new Date());
    });

    // Background polling every 3 seconds for continuous multi-device sync
    const pollInterval = setInterval(() => {
      loadMatches(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [todayStr, activeMatchNumber]);

  // Sync active match to current view
  useEffect(() => {
    const target = activeMatchNumber === 1 ? match1 : match2;
    setCurrentMatch(target);
    if (target?.scorecard) {
      setTeamAScore(target.scorecard.teamAScore);
      setTeamBScore(target.scorecard.teamBScore);
      setPlayerStats(target.scorecard.playerStats || {});
      setWinnerTeamId(target.winnerTeamId || null);
    } else {
      setTeamAScore({ runs: 0, wickets: 0, overs: 0 });
      setTeamBScore({ runs: 0, wickets: 0, overs: 0 });
      setPlayerStats({});
      setWinnerTeamId(null);
    }
  }, [activeMatchNumber, match1, match2]);

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

  const commitAndBroadcastMatch = async (match: MatchSession) => {
    setCurrentMatch(match);
    if (match.matchNumber === 2) {
      setMatch2(match);
    } else {
      setMatch1(match);
    }
    saveCurrentMatch(match);
    saveMatchToHistory(match);
    await syncMatchToSupabase(match);
    setLastSyncTime(new Date());
  };

  const handleMakeTeams = async (forceMatchNumber?: 1 | 2) => {
    const available = activePlayers.filter((p) => selectedPlayerIds.includes(p.id));
    if (available.length < 4) {
      alert('Please select at least 4 available players.');
      return;
    }

    const targetMatchNumber = forceMatchNumber || activeMatchNumber;
    const history = getMatchHistory();
    const result = generateTeams(available, history, useJokerOption);

    const matchDate = todayStr;
    const newMatch: MatchSession = {
      id: `match-${matchDate}-${targetMatchNumber}-${Date.now()}`,
      date: matchDate,
      matchNumber: targetMatchNumber,
      availablePlayerIds: selectedPlayerIds,
      teamA: result.teamA,
      teamB: result.teamB,
      joker: result.joker || null,
      limitations: result.limitations,
      isLocked: false,
      tossResult: null,
      winnerTeamId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await commitAndBroadcastMatch(newMatch);
    setIsPlayerSelectorExpanded(false);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleReuseMatch1TeamsForMatch2 = async () => {
    if (!match1 || !match1.teamA || !match1.teamB) {
      alert('Match 1 teams are not yet generated.');
      return;
    }

    const newMatch: MatchSession = {
      id: `match-${todayStr}-2-${Date.now()}`,
      date: todayStr,
      matchNumber: 2,
      availablePlayerIds: match1.availablePlayerIds,
      teamA: { ...match1.teamA },
      teamB: { ...match1.teamB },
      joker: match1.joker ? { ...match1.joker } : null,
      limitations: match1.limitations || [],
      isLocked: false,
      tossResult: null,
      winnerTeamId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await commitAndBroadcastMatch(newMatch);
    setActiveMatchNumber(2);

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

  const handleReplaceCaptain = async (teamId: 'teamA' | 'teamB', newCaptainId: string) => {
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

    await commitAndBroadcastMatch(updatedMatch);
  };

  const handleToggleLock = async () => {
    if (!currentMatch) return;
    const updatedMatch: MatchSession = {
      ...currentMatch,
      isLocked: !currentMatch.isLocked,
      updatedAt: new Date().toISOString(),
    };
    await commitAndBroadcastMatch(updatedMatch);
  };

  const handleTossComplete = async (outcome: TossOutcome) => {
    if (!currentMatch) return;
    const updatedMatch: MatchSession = {
      ...currentMatch,
      tossResult: outcome,
      updatedAt: new Date().toISOString(),
    };
    await commitAndBroadcastMatch(updatedMatch);
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

  const handleCopyLaptopLink = async () => {
    if (!currentMatch) return;
    const ok = await copyMatchDirectLink(currentMatch);
    if (ok) {
      setShareFeedback('🔗 Laptop Direct Link copied! Open this link on your Laptop to view today\'s teams instantly.');
    } else {
      setShareFeedback('Failed to copy link.');
    }
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleStartNewMatch = async () => {
    if (
      confirm(
        `Reset current Match ${activeMatchNumber}? Teams and scores for this match will be reset, but history is retained.`
      )
    ) {
      const freshMatch: MatchSession = {
        id: `match-${todayStr}-${activeMatchNumber}-${Date.now()}`,
        date: todayStr,
        matchNumber: activeMatchNumber,
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
      await commitAndBroadcastMatch(freshMatch);
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

  const handleSaveScoreboard = async () => {
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

    await commitAndBroadcastMatch(updatedMatch);

    setSaveMessage('Scoreboard & player statistics updated and live-synced across all devices!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const allPlayers =
    currentMatch && currentMatch.teamA && currentMatch.teamB
      ? [...currentMatch.teamA.players, ...currentMatch.teamB.players]
      : [];

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-4 animate-fade-in">
      {/* Real-time Multi-Device Sync Header Bar */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-3.5 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-turf-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-turf-500"></span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-turf-400 tracking-wider flex items-center space-x-1">
              <span>{syncStatus.toUpperCase()}</span>
              <span className="text-stadium-500">•</span>
              <span className="text-stadium-300 font-mono">{lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="text-xs text-stadium-400 font-medium">
              Auto-synced for Vasu, Vinodh Sir, RK Sir & All Faculty
            </div>
          </div>
        </div>

        <button
          onClick={() => loadMatches(false)}
          disabled={isSyncing}
          className="p-2 rounded-xl bg-stadium-800 hover:bg-stadium-700 border border-stadium-700 text-stadium-200 transition-all flex items-center space-x-1 text-xs font-bold"
          title="Refresh match details from cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-turf-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>SYNC</span>
        </button>
      </div>

      {/* MATCH 1 / MATCH 2 SELECTOR BAR */}
      <div className="bg-stadium-900/90 border border-stadium-800 p-1.5 rounded-2xl flex items-center space-x-1.5 shadow-lg">
        <button
          onClick={() => setActiveMatchNumber(1)}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeMatchNumber === 1
              ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md shadow-turf-500/20'
              : 'text-stadium-300 hover:bg-stadium-800'
          }`}
        >
          <span>MATCH 1</span>
          {match1?.teamA && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeMatchNumber === 1
                  ? 'bg-stadium-950/30 text-stadium-950'
                  : 'bg-turf-500/20 text-turf-400'
              }`}
            >
              READY
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMatchNumber(2)}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeMatchNumber === 2
              ? 'bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 shadow-md shadow-turf-500/20'
              : 'text-stadium-300 hover:bg-stadium-800'
          }`}
        >
          <span>MATCH 2</span>
          {match2?.teamA ? (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeMatchNumber === 2
                  ? 'bg-stadium-950/30 text-stadium-950'
                  : 'bg-gold-500/20 text-gold-400'
              }`}
            >
              READY
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-stadium-800 text-stadium-400">
              OPTIONAL
            </span>
          )}
        </button>
      </div>

      {/* MATCH DATE & HEADER INFO */}
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 flex items-center justify-between shadow-md">
        <div>
          <div className="text-[10px] font-black uppercase text-turf-400 tracking-widest flex items-center space-x-1.5">
            <span>TODAY'S MATCH {activeMatchNumber}</span>
            <span className="text-stadium-600">•</span>
            <span className="text-gold-400">FACULTY CRICKET</span>
          </div>
          <div className="text-lg font-black text-white">{formatDateDisplay(todayStr)}</div>
        </div>

        <button
          onClick={handleStartNewMatch}
          className="px-3 py-1.5 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 rounded-xl text-xs font-bold border border-stadium-700 transition-all flex items-center space-x-1"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>RESET M{activeMatchNumber}</span>
        </button>
      </div>

      {/* QUICK MATCH 2 HELPER CARD (IF IN MATCH 2 AND NOT YET GENERATED) */}
      {activeMatchNumber === 2 && !match2?.teamA && match1?.teamA && (
        <div className="bg-gradient-to-br from-stadium-900 via-stadium-900 to-gold-950/30 border border-gold-500/30 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-gold-400" />
            <h3 className="font-extrabold text-white text-sm">Quick Setup for Match 2</h3>
          </div>
          <p className="text-xs text-stadium-300">
            You can either reuse the exact same balanced teams from Match 1 or generate freshly shuffled teams for
            Match 2.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleReuseMatch1TeamsForMatch2}
              className="py-2.5 px-3 rounded-xl bg-stadium-800 hover:bg-stadium-700 border border-gold-500/40 text-gold-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Reuse M1 Teams</span>
            </button>
            <button
              onClick={() => handleMakeTeams(2)}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-turf-500/20"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>New Teams for M2</span>
            </button>
          </div>
        </div>
      )}

      {/* MATCH TEAMS OR PLAYER SELECTOR DEPENDING ON STATE */}
      {currentMatch && currentMatch.teamA && currentMatch.teamB ? (
        <div className="space-y-6 animate-fade-in">
          {/* Live Synced Match Banner */}
          <div className="bg-gradient-to-r from-turf-500/20 via-stadium-900 to-turf-500/20 border border-turf-500/40 rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-turf-400" />
              <div>
                <div className="text-xs font-black text-white">MATCH {activeMatchNumber} TEAMS GENERATED & SHARED</div>
                <div className="text-[10px] text-turf-400 font-bold">Live Synced for Vasu, Vinodh Sir, RK Sir & Faculty</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-turf-500 text-stadium-950 uppercase tracking-wider">
              TEAMS READY
            </span>
          </div>

          {/* Quick Match Action Bar */}
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
              onClick={handleCopyLaptopLink}
              className="px-3 py-2 bg-stadium-800 hover:bg-stadium-700 text-gold-400 rounded-xl font-bold border border-gold-500/40 transition-all flex items-center space-x-1"
              title="Copy Direct Link for Laptop"
            >
              <LinkIcon className="w-4 h-4 text-gold-400" />
              <span>LINK</span>
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
                JOKER / EXTRA PLAYER (PLAYS FOR BOTH SIDES)
              </div>
              <div className="text-lg font-black text-white">{currentMatch.joker.name}</div>
              <div className="text-xs text-stadium-300">
                Active on both teams with equal participation.
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

          {/* COLLAPSIBLE GROUND CHECK-IN / ATTENDANCE SECTION */}
          <div className="bg-stadium-900 border border-stadium-800 rounded-3xl overflow-hidden shadow-lg mt-6">
            <button
              onClick={() => setIsPlayerSelectorExpanded(!isPlayerSelectorExpanded)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-stadium-850 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-turf-400" />
                <div>
                  <div className="text-sm font-extrabold text-white">
                    Ground Check-in & Attendance ({selectedPlayerIds.length} Present)
                  </div>
                  <div className="text-[10px] text-stadium-400 font-semibold uppercase tracking-wider">
                    {isPlayerSelectorExpanded
                      ? 'Click to hide player selection list'
                      : 'Click to edit present players or re-generate teams'}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs font-black text-turf-400 bg-stadium-800 px-3 py-1.5 rounded-xl border border-stadium-700">
                <span>{isPlayerSelectorExpanded ? 'HIDE' : 'EDIT PLAYERS'}</span>
                {isPlayerSelectorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isPlayerSelectorExpanded && (
              <div className="p-4 pt-2 border-t border-stadium-800/60 space-y-3">
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
                      Odd player count ({selectedPlayerIds.length}): Vasu plays on both sides (Joker)
                    </span>
                    <span className="text-[10px] font-black text-gold-400 bg-gold-500/20 px-2 py-0.5 rounded-lg border border-gold-500/40">
                      EXTRA PLAYER AUTO-ON
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleMakeTeams()}
                  disabled={selectedPlayerIds.length < 4}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-base tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RE-GENERATE TEAMS FOR MATCH {activeMatchNumber} ({selectedPlayerIds.length} PLAYERS)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* NO TEAMS GENERATED YET - EXPANDED GROUND CHECK-IN PRIMARY VIEW */
        <div className="space-y-3">
          <div className="bg-turf-500/10 border border-turf-500/30 rounded-2xl p-3 text-center text-xs text-turf-300 font-bold">
            🏏 Select present players on the ground below and tap MAKE TEAMS to generate Match {activeMatchNumber}.
          </div>

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
                Odd player count ({selectedPlayerIds.length}): Vasu plays on both sides (Joker)
              </span>
              <span className="text-[10px] font-black text-gold-400 bg-gold-500/20 px-2 py-0.5 rounded-lg border border-gold-500/40">
                EXTRA PLAYER AUTO-ON
              </span>
            </div>
          )}

          <button
            onClick={() => handleMakeTeams()}
            disabled={selectedPlayerIds.length < 4}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-lg tracking-wider shadow-xl shadow-turf-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>MAKE TEAMS FOR MATCH {activeMatchNumber}</span>
          </button>
        </div>
      )}

          {/* TOSS SECTION */}
          <div className="pt-4 border-t border-stadium-800 space-y-2">
            <div className="text-xs font-bold text-stadium-400 uppercase tracking-wider px-1">
              Match {activeMatchNumber} Ground Toss
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
                    MATCH {activeMatchNumber} SCOREBOARD & RATINGS
                  </h3>
                </div>
                <span className="text-[10px] text-turf-400 font-extrabold uppercase">
                  Live Cloud Sync
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
                  <span className="font-extrabold text-turf-400 block truncate">{currentMatch?.teamA?.name || 'Team A'} Score</span>
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
                  <span className="font-extrabold text-gold-400 block truncate">{currentMatch?.teamB?.name || 'Team B'} Score</span>
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

              {/* Match Winner Selection */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-stadium-300">Match Winner:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setWinnerTeamId('teamA')}
                    className={`py-2 px-1 rounded-xl font-bold border transition-all text-xs truncate ${
                      winnerTeamId === 'teamA'
                        ? 'bg-turf-500 text-stadium-950 border-turf-500 shadow-md font-black'
                        : 'bg-stadium-950 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                    }`}
                  >
                    {currentMatch?.teamA?.name || 'Team A'}
                  </button>

                  <button
                    onClick={() => setWinnerTeamId('teamB')}
                    className={`py-2 px-1 rounded-xl font-bold border transition-all text-xs truncate ${
                      winnerTeamId === 'teamB'
                        ? 'bg-gold-500 text-stadium-950 border-gold-500 shadow-md font-black'
                        : 'bg-stadium-950 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                    }`}
                  >
                    {currentMatch?.teamB?.name || 'Team B'}
                  </button>

                  <button
                    onClick={() => setWinnerTeamId('TIE')}
                    className={`py-2 px-1 rounded-xl font-bold border transition-all text-xs ${
                      winnerTeamId === 'TIE'
                        ? 'bg-purple-500 text-white border-purple-500 shadow-md font-black'
                        : 'bg-stadium-950 border-stadium-800 text-stadium-300 hover:border-stadium-700'
                    }`}
                  >
                    Tie Match
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowStatsEntry(!showStatsEntry)}
                  className="flex-1 py-2.5 bg-stadium-800 hover:bg-stadium-700 text-stadium-200 border border-stadium-700 rounded-xl text-xs font-bold transition-all"
                >
                  {showStatsEntry ? 'Hide Player Stats Entry' : 'Enter Player Stats'}
                </button>

                <button
                  onClick={handleSaveScoreboard}
                  className="flex-1 py-2.5 bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-black rounded-xl text-xs shadow-lg shadow-turf-500/20 hover:brightness-110 flex items-center justify-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Sync All Devices</span>
                </button>
              </div>

              {/* INDIVIDUAL PLAYER STATS ENTRY */}
              {showStatsEntry && (
                <div className="space-y-3 pt-3 border-t border-stadium-800 max-h-72 overflow-y-auto pr-1">
                  <div className="text-xs font-extrabold text-stadium-300 uppercase">
                    Individual Player Performances
                  </div>
                  {allPlayers.map((player) => {
                    const stat = playerStats[player.id] || {
                      runsScored: 0,
                      ballsFaced: 0,
                      fours: 0,
                      sixes: 0,
                      wicketsTaken: 0,
                      oversBowled: 0,
                      runsConceded: 0,
                      catches: 0,
                    };

                    return (
                      <div
                        key={player.id}
                        className="bg-stadium-950/80 p-3 rounded-2xl border border-stadium-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-white">{player.name}</span>
                          <span className="text-[10px] text-stadium-400 font-bold">
                            {currentMatch?.teamA?.players.some((p) => p.id === player.id)
                              ? currentMatch?.teamA?.name
                              : currentMatch?.teamB?.name}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                          <div>
                            <span className="text-[9px] text-stadium-400 block">Runs</span>
                            <input
                              type="number"
                              value={stat.runsScored || ''}
                              onChange={(e) =>
                                handleUpdatePlayerStat(player.id, 'runsScored', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-stadium-400 block">Balls</span>
                            <input
                              type="number"
                              value={stat.ballsFaced || ''}
                              onChange={(e) =>
                                handleUpdatePlayerStat(player.id, 'ballsFaced', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-stadium-400 block">Wickets</span>
                            <input
                              type="number"
                              value={stat.wicketsTaken || ''}
                              onChange={(e) =>
                                handleUpdatePlayerStat(player.id, 'wicketsTaken', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-stadium-400 block">Catches</span>
                            <input
                              type="number"
                              value={stat.catches || ''}
                              onChange={(e) =>
                                handleUpdatePlayerStat(player.id, 'catches', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-full bg-stadium-900 border border-stadium-700 rounded p-1 text-center font-bold text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

      {/* PRINTABLE / SHAREABLE MATCH CARD MODAL */}
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
