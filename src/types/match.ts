import type { Team } from './team';
import type { Player } from './player';

export type TossOutcome = 'HEADS' | 'TAILS';

export interface PlayerMatchStat {
  playerId: string;
  playerName: string;
  teamId: 'teamA' | 'teamB';
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  oversBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  dotBalls: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  impactScore?: number;
  certification?: string; // e.g. "Certified Star Batsman", "Certified Bowling Master"
}

export interface TeamScore {
  runs: number;
  wickets: number;
  overs: number;
}

export interface MatchScorecard {
  teamAScore: TeamScore;
  teamBScore: TeamScore;
  playerStats: Record<string, PlayerMatchStat>;
  momPlayerId?: string; // Man of the Match
  isCompleted: boolean;
}

export interface TossRecord {
  id: string;
  timestamp: string;
  outcome: TossOutcome;
  callerId?: string;
}

export interface MatchSession {
  id: string;
  date: string;
  availablePlayerIds: string[];
  teamA: Team | null;
  teamB: Team | null;
  joker: Player | null;
  limitations: string[];
  isLocked: boolean;
  tossResult: TossOutcome | null;
  winnerTeamId: 'teamA' | 'teamB' | 'TIE' | null;
  scorecard?: MatchScorecard;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
