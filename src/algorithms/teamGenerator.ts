import type { Player } from '../types/player';
import type { Team, TeamGenerationResult } from '../types/team';
import type { MatchSession } from '../types/match';
import {
  calculateTeamRoleSummary,
  calculateBalanceScore,
} from './teamScoring';
import { calculateRepetitionPenalty } from './repetitionPenalty';
import { selectCaptains } from './captainSelector';
import {
  isVasu,
  isSrinivas,
  isShiva,
  isRK,
  isAnurupam,
  isSuresh,
  isKrishna,
  isVinod,
} from './playerHelpers';

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

  // If odd number of players:
  // Vasu is always the extra player / joker playing on both sides if Vasu is present
  if (total % 2 !== 0) {
    const vasuIndex = pool.findIndex(isVasu);
    if (vasuIndex !== -1) {
      jokerPlayer = pool.splice(vasuIndex, 1)[0];
      teamASize = pool.length / 2;
    } else if (useJokerForOdd) {
      pool = shuffleArray([...availablePlayers]);
      jokerPlayer = pool.pop();
      teamASize = pool.length / 2;
    } else {
      teamASize = Math.floor(total / 2);
    }
  } else {
    teamASize = Math.floor(total / 2);
  }

  const hasVasu = pool.some(isVasu);
  const hasRK = pool.some(isRK);
  const hasAnurupam = pool.some(isAnurupam);

  // Probabilistic 5/6 (83.33%) targets for RK and Anurupam to be in Vasu's team
  const rkTargetSame = (hasRK && hasVasu) ? (Math.random() < 5 / 6) : null;
  const anurupamTargetSame = (hasAnurupam && hasVasu) ? (Math.random() < 5 / 6) : null;

  const targets = { rkTargetSame, anurupamTargetSame };

  const SAMPLE_COUNT = Math.min(1000, Math.pow(2, pool.length));
  let bestScore = -Infinity;
  let bestSplit: { teamA: Player[]; teamB: Player[] } | null = null;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const shuffled = shuffleArray([...pool]);
    const candidateA = shuffled.slice(0, teamASize);
    const candidateB = shuffled.slice(teamASize);

    if (!isSplitValid(candidateA, candidateB, targets, true)) {
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

  // Fallback if no candidate satisfied strict probabilistic targets
  if (!bestSplit) {
    let attempts = 0;
    while (attempts < 500) {
      const shuffled = shuffleArray([...pool]);
      const candidateA = shuffled.slice(0, teamASize);
      const candidateB = shuffled.slice(teamASize);

      // Relax probabilistic targets if needed after 200 attempts
      const enforceProb = attempts < 200;
      if (isSplitValid(candidateA, candidateB, targets, enforceProb)) {
        bestSplit = { teamA: candidateA, teamB: candidateB };
        break;
      }
      attempts++;
    }

    if (!bestSplit) {
      const shuffled = shuffleArray([...pool]);
      bestSplit = {
        teamA: shuffled.slice(0, teamASize),
        teamB: shuffled.slice(teamASize),
      };
    }
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

function isSplitValid(
  candidateA: Player[],
  candidateB: Player[],
  targets: {
    rkTargetSame: boolean | null;
    anurupamTargetSame: boolean | null;
  },
  enforceProbabilistic: boolean = true
): boolean {
  // 1. Srinivas & Shiva ALWAYS in opposite teams
  const srinivasInA = candidateA.some(isSrinivas);
  const srinivasInB = candidateB.some(isSrinivas);
  const shivaInA = candidateA.some(isShiva);
  const shivaInB = candidateB.some(isShiva);

  if ((srinivasInA && shivaInA) || (srinivasInB && shivaInB)) {
    return false;
  }

  // 2. Suresh & Vasu ALWAYS in same team
  const vasuInA = candidateA.some(isVasu);
  const vasuInB = candidateB.some(isVasu);
  const sureshInA = candidateA.some(isSuresh);
  const sureshInB = candidateB.some(isSuresh);

  if ((sureshInA || sureshInB) && (vasuInA || vasuInB)) {
    if ((sureshInA && vasuInB) || (sureshInB && vasuInA)) {
      return false;
    }
  }

  // 3. Vinod Sir & Vasu ALWAYS in same team
  const vinodInA = candidateA.some(isVinod);
  const vinodInB = candidateB.some(isVinod);

  if ((vinodInA || vinodInB) && (vasuInA || vasuInB)) {
    if ((vinodInA && vasuInB) || (vinodInB && vasuInA)) {
      return false;
    }
  }

  // 4. Krishna & Vasu ALWAYS in opposite teams
  const krishnaInA = candidateA.some(isKrishna);
  const krishnaInB = candidateB.some(isKrishna);

  if ((krishnaInA || krishnaInB) && (vasuInA || vasuInB)) {
    if ((krishnaInA && vasuInA) || (krishnaInB && vasuInB)) {
      return false;
    }
  }

  // 5. Probabilistic 5/6 rules for RK and Anurupam with Vasu
  if (enforceProbabilistic && (vasuInA || vasuInB)) {
    // RK with Vasu 5 out of 6 times
    if (targets.rkTargetSame !== null) {
      const rkInA = candidateA.some(isRK);
      const rkInB = candidateB.some(isRK);
      if (rkInA || rkInB) {
        const isSame = (rkInA && vasuInA) || (rkInB && vasuInB);
        if (isSame !== targets.rkTargetSame) {
          return false;
        }
      }
    }

    // Anurupam with Vasu 5 out of 6 times
    if (targets.anurupamTargetSame !== null) {
      const anurupamInA = candidateA.some(isAnurupam);
      const anurupamInB = candidateB.some(isAnurupam);
      if (anurupamInA || anurupamInB) {
        const isSame = (anurupamInA && vasuInA) || (anurupamInB && vasuInB);
        if (isSame !== targets.anurupamTargetSame) {
          return false;
        }
      }
    }
  }

  return true;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
