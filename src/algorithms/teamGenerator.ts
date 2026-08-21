import type { Player } from '../types/player';
import type { Team, TeamGenerationResult } from '../types/team';
import type { MatchSession } from '../types/match';
import {
  calculateTeamRoleSummary,
  calculateBalanceScore,
} from './teamScoring';
import { calculateRepetitionPenalty } from './repetitionPenalty';
import { selectCaptains } from './captainSelector';

export function generateTeams(
  availablePlayers: Player[],
  history: MatchSession[] = [],
  useJokerForOdd: boolean = false
): TeamGenerationResult {
  if (availablePlayers.length < 4) {
    throw new Error('At least 4 players are required to make two teams.');
  }

  const total = availablePlayers.length;
  let teamASize: number;
  let jokerPlayer: Player | undefined = undefined;

  let pool = [...availablePlayers];

  if (useJokerForOdd && total % 2 !== 0) {
    pool = shuffleArray([...availablePlayers]);
    jokerPlayer = pool.pop();
    teamASize = Math.floor(pool.length / 2);
  } else {
    teamASize = Math.floor(total / 2);
  }

  const SAMPLE_COUNT = Math.min(600, Math.pow(2, pool.length));
  let bestScore = -Infinity;
  let bestSplit: { teamA: Player[]; teamB: Player[] } | null = null;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const shuffled = shuffleArray([...pool]);
    const candidateA = shuffled.slice(0, teamASize);
    const candidateB = shuffled.slice(teamASize);

    // Keep Krishna sir and Vasu in different/opposite teams
    const hasKrishnaA = candidateA.some(isKrishna);
    const hasVasuA = candidateA.some(isVasu);
    const hasKrishnaB = candidateB.some(isKrishna);
    const hasVasuB = candidateB.some(isVasu);

    if ((hasKrishnaA && hasVasuA) || (hasKrishnaB && hasVasuB)) {
      continue;
    }

    const summaryA = calculateTeamRoleSummary(candidateA);
    const summaryB = calculateTeamRoleSummary(candidateB);

    const baseBalance = calculateBalanceScore(summaryA, summaryB);
    const repPenalty = calculateRepetitionPenalty(candidateA, candidateB, history);

    const noise = (Math.random() - 0.5) * 10;
    const finalScore = baseBalance - repPenalty + noise;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestSplit = { teamA: candidateA, teamB: candidateB };
    }
  }

  if (!bestSplit) {
    let fallbackA: Player[] = [];
    let fallbackB: Player[] = [];
    let attempts = 0;
    while (attempts < 100) {
      const shuffled = shuffleArray([...pool]);
      fallbackA = shuffled.slice(0, teamASize);
      fallbackB = shuffled.slice(teamASize);
      const hasKrishnaA = fallbackA.some(isKrishna);
      const hasVasuA = fallbackA.some(isVasu);
      const hasKrishnaB = fallbackB.some(isKrishna);
      const hasVasuB = fallbackB.some(isVasu);
      if (!((hasKrishnaA && hasVasuA) || (hasKrishnaB && hasVasuB))) {
        break;
      }
      attempts++;
    }
    bestSplit = {
      teamA: fallbackA,
      teamB: fallbackB,
    };
  }

  const { captainA, captainB } = selectCaptains(bestSplit.teamA, bestSplit.teamB, history);

  const summaryA = calculateTeamRoleSummary(bestSplit.teamA);
  const summaryB = calculateTeamRoleSummary(bestSplit.teamB);
  const finalBalanceScore = calculateBalanceScore(summaryA, summaryB);

  const limitations: string[] = [];
  const totalPace = summaryA.paceCount + summaryB.paceCount;
  const totalSpin = summaryA.spinCount + summaryB.spinCount;

  if (totalPace < 4) {
    limitations.push(`Role limitation: Only ${totalPace} pace bowler(s) available today in total.`);
  }
  if (totalSpin === 0) {
    limitations.push('Role limitation: No dedicated spinners available today.');
  } else if (totalSpin === 1) {
    limitations.push('Role limitation: Only one dedicated spinner is available today.');
  }

  if (availablePlayers.length <= 5) {
    limitations.push('Notice: Very small player count — role balance is limited.');
  }

  const teamA: Team = {
    id: 'teamA',
    captainId: captainA.id,
    captainName: captainA.name,
    name: `${captainA.name.toUpperCase()}'S TEAM`,
    players: bestSplit.teamA,
    roleSummary: summaryA,
  };

  const teamB: Team = {
    id: 'teamB',
    captainId: captainB.id,
    captainName: captainB.name,
    name: `${captainB.name.toUpperCase()}'S TEAM`,
    players: bestSplit.teamB,
    roleSummary: summaryB,
  };

  return {
    teamA,
    teamB,
    joker: jokerPlayer,
    balanceScore: finalBalanceScore,
    limitations,
    generatedAt: new Date().toISOString(),
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isKrishna(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return name === 'krishna' || name === 'krishna sir' || player.id === 'p-krishna';
}

function isVasu(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return name === 'vasu' || player.id === 'p-vasu';
}
