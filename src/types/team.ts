import type { Player } from './player';

export interface TeamRoleSummary {
  paceCount: number;
  spinCount: number;
  allRounderCount: number;
  batsmanCount: number;
  totalPlayers: number;
  strengthScore: number;
}

export interface Team {
  id: 'teamA' | 'teamB';
  captainId: string;
  captainName: string;
  name: string; // Dynamic name e.g. "VASU'S TEAM"
  players: Player[];
  roleSummary: TeamRoleSummary;
}

export interface TeamGenerationResult {
  teamA: Team;
  teamB: Team;
  joker?: Player;
  balanceScore: number; // 0 to 100 high balance
  limitations: string[];
  generatedAt: string;
}
