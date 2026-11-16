import type { Player } from '../types/player';
import type { Team, TeamGenerationResult } from '../types/team';
import type { MatchSession } from '../types/match';
import {
  calculateTeamRoleSummary,
  calculateBalanceScore,
  isStrikeBowler,
  isTopBatter,
  isSpinBowler,
  isPaceBowler,
} from './teamScoring';
import { calculateRepetitionPenalty } from './repetitionPenalty';
import { selectCaptains } from './captainSelector';
import {
  isVasu,
  isSrinivas,
  isShiva,
  isRK,
  isLK,
  isAnurupam,
  isSuresh,
  isKrishna,
  isVinod,
  isAshok,
  isSupportClusterPlayer,
} from './playerHelpers';

/**
 * Determines whether Srinivas and Shiva should be on opposite teams (true) or same team (false)
 * to maintain the ratio of being on the same team 1 out of 3 matches (1/3 same, 2/3 opposite).
 */
export function determineSrinivasShivaOppositeTarget(
  history: MatchSession[],
  hasSrinivas: boolean,
  hasShiva: boolean
): boolean | null {
  if (!hasSrinivas || !hasShiva) return null;

  // Gather recent matches where both Srinivas & Shiva were on teamA or teamB (not joker)
  const recentOppositeHistory: boolean[] = [];
  for (let i = history.length - 1; i >= 0 && recentOppositeHistory.length < 5; i--) {
    const m = history[i];
    if (!m.teamA || !m.teamB) continue;

    const srA = m.teamA.players.some(isSrinivas);
    const srB = m.teamB.players.some(isSrinivas);
    const shivaA = m.teamA.players.some(isShiva);
    const shivaB = m.teamB.players.some(isShiva);

    if ((srA || srB) && (shivaA || shivaB)) {
      const isOpp = (srA && shivaB) || (srB && shivaA);
      recentOppositeHistory.push(isOpp);
    }
  }

  const oppCount = recentOppositeHistory.filter(Boolean).length;
  const sameCount = recentOppositeHistory.length - oppCount;

  // In a 6-match window, Srinivas is opposite Shiva 4 times and together 2 times (1 out of 3 same)
  if (oppCount >= 4) {
    return false; // Reached cap of 4 opposite -> force same team
  }
  if (sameCount >= 2) {
    return true; // Reached cap of 2 same team -> force opposite teams
  }

  const remainingOpp = 4 - oppCount;
  const remainingSlots = 6 - recentOppositeHistory.length;
  const probOpp = Math.max(0, Math.min(1, remainingOpp / remainingSlots));
  return Math.random() < probOpp;
}

/**
 * Determines whether Ashok Sir and Vasu should be on the same team (true) or opposite teams (false)
 * to maintain the ratio of 2 out of 5 matches on the same team (2/5 same, 3/5 opposite).
 */
export function determineAshokVasuSameTarget(
  history: MatchSession[],
  hasAshok: boolean,
  hasVasu: boolean
): boolean | null {
  if (!hasAshok || !hasVasu) return null;

  // Gather recent matches where both Ashok & Vasu were on teamA or teamB (not joker)
  const recentSameHistory: boolean[] = [];
  for (let i = history.length - 1; i >= 0 && recentSameHistory.length < 4; i--) {
    const m = history[i];
    if (!m.teamA || !m.teamB) continue;

    const ashokA = m.teamA.players.some(isAshok);
    const ashokB = m.teamB.players.some(isAshok);
    const vasuA = m.teamA.players.some(isVasu);
    const vasuB = m.teamB.players.some(isVasu);

    if ((ashokA || ashokB) && (vasuA || vasuB)) {
      const isSame = (ashokA && vasuA) || (ashokB && vasuB);
      recentSameHistory.push(isSame);
    }
  }

  const sameCount = recentSameHistory.filter(Boolean).length;
  const oppCount = recentSameHistory.length - sameCount;

  // In a 5-match window: cap of 2 same team, 3 opposite
  if (sameCount >= 2) {
    return false; // Reached cap of 2 same team -> force opposite teams
  }
  if (oppCount >= 3) {
    return true; // Reached cap of 3 opposite -> force same team
  }

  const remainingSame = 2 - sameCount;
  const remainingSlots = 5 - recentSameHistory.length;
  const probSame = Math.max(0, Math.min(1, remainingSame / remainingSlots));
  return Math.random() < probSame;
}

export interface LKSrinivasTargets {
  lkTargetSameAsVasu: boolean | null;
  srinivasTargetSameAsVasu: boolean | null;
  lkSrinivasTargetSameTeam: boolean | null;
}

/**
 * Determines targets for LK Sir and Srinivas Sir:
 * 1. Frequently change in Vasu's team (rotate into/out of Vasu's team between matches).
 * 2. Come in the same team also (regularly play together).
 */
export function determineLKSrinivasTargets(
  history: MatchSession[],
  hasVasu: boolean,
  hasLK: boolean,
  hasSrinivas: boolean,
  vasuTeamSlotsAvailable: number
): LKSrinivasTargets {
  if (!hasLK && !hasSrinivas) {
    return {
      lkTargetSameAsVasu: null,
      srinivasTargetSameAsVasu: null,
      lkSrinivasTargetSameTeam: null,
    };
  }

  // Case 1: Vasu is not in the pool (e.g. absent or Vasu is Joker playing on both sides)
  if (!hasVasu) {
    if (hasLK && hasSrinivas) {
      // Find whether LK and Srinivas were on same team in the most recent match
      let lastLkSrSame: boolean | null = null;
      for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        if (!m.teamA || !m.teamB) continue;
        const lkA = m.teamA.players.some(isLK);
        const lkB = m.teamB.players.some(isLK);
        const srA = m.teamA.players.some(isSrinivas);
        const srB = m.teamB.players.some(isSrinivas);
        if ((lkA || lkB) && (srA || srB)) {
          lastLkSrSame = (lkA && srA) || (lkB && srB);
          break;
        }
      }

      // Alternate: ~50% same team, ~50% opposite
      const probSame = lastLkSrSame === true ? 0.35 : 0.60;
      return {
        lkTargetSameAsVasu: null,
        srinivasTargetSameAsVasu: null,
        lkSrinivasTargetSameTeam: Math.random() < probSame,
      };
    }

    return {
      lkTargetSameAsVasu: null,
      srinivasTargetSameAsVasu: null,
      lkSrinivasTargetSameTeam: null,
    };
  }

  // Case 2: Vasu is playing in a team (hasVasu is true)
  if (hasLK && hasSrinivas) {
    let lastLkWithVasu: boolean | null = null;
    let lastSrWithVasu: boolean | null = null;
    let lastLkSrSame: boolean | null = null;

    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (!m.teamA || !m.teamB) continue;

      const vasuA = m.teamA.players.some(isVasu);
      const vasuB = m.teamB.players.some(isVasu);
      if (!vasuA && !vasuB) continue;

      const lkA = m.teamA.players.some(isLK);
      const lkB = m.teamB.players.some(isLK);
      const srA = m.teamA.players.some(isSrinivas);
      const srB = m.teamB.players.some(isSrinivas);

      if (lastLkWithVasu === null && (lkA || lkB)) {
        lastLkWithVasu = (vasuA && lkA) || (vasuB && lkB);
      }
      if (lastSrWithVasu === null && (srA || srB)) {
        lastSrWithVasu = (vasuA && srA) || (vasuB && srB);
      }
      if (lastLkSrSame === null && (lkA || lkB) && (srA || srB)) {
        lastLkSrSame = (lkA && srA) || (lkB && srB);
      }

      if (lastLkWithVasu !== null && lastSrWithVasu !== null && lastLkSrSame !== null) {
        break;
      }
    }

    // Determine whether LK and Srinivas should come in the SAME team in this match
    let targetSameTeam: boolean;
    if (lastLkSrSame === true) {
      targetSameTeam = Math.random() < 0.35; // 35% same, 65% rotate to opposite
    } else if (lastLkSrSame === false) {
      targetSameTeam = Math.random() < 0.55; // 55% same team
    } else {
      targetSameTeam = Math.random() < 0.45; // default ~45% same team
    }

    const canBothFitWithVasu = vasuTeamSlotsAvailable >= 2;

    if (targetSameTeam) {
      // Both LK and Srinivas on the SAME TEAM!
      let bothWithVasu = false;
      if (canBothFitWithVasu) {
        if (lastLkWithVasu === true && lastSrWithVasu === true) {
          bothWithVasu = false; // rotate opposite Vasu
        } else if (lastLkWithVasu === false && lastSrWithVasu === false) {
          bothWithVasu = true; // rotate to with Vasu
        } else {
          bothWithVasu = Math.random() < 0.5;
        }
      } else {
        bothWithVasu = false; // both fit together opposite Vasu
      }

      return {
        lkTargetSameAsVasu: bothWithVasu,
        srinivasTargetSameAsVasu: bothWithVasu,
        lkSrinivasTargetSameTeam: true,
      };
    } else {
      // LK and Srinivas on OPPOSITE TEAMS (one with Vasu, one opposite Vasu)
      let lkWithVasu: boolean;
      if (lastLkWithVasu === true && lastSrWithVasu === false) {
        lkWithVasu = false; // LK rotates out, Srinivas rotates in
      } else if (lastLkWithVasu === false && lastSrWithVasu === true) {
        lkWithVasu = true; // Srinivas rotates out, LK rotates in
      } else if (lastLkWithVasu === true) {
        lkWithVasu = false;
      } else if (lastSrWithVasu === true) {
        lkWithVasu = true;
      } else {
        lkWithVasu = Math.random() < 0.5;
      }

      return {
        lkTargetSameAsVasu: lkWithVasu,
        srinivasTargetSameAsVasu: !lkWithVasu,
        lkSrinivasTargetSameTeam: false,
      };
    }
  }

  // Only LK is present
  if (hasLK) {
    let lastLkWithVasu: boolean | null = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (!m.teamA || !m.teamB) continue;
      const vasuA = m.teamA.players.some(isVasu);
      const vasuB = m.teamB.players.some(isVasu);
      if (!vasuA && !vasuB) continue;
      const lkA = m.teamA.players.some(isLK);
      const lkB = m.teamB.players.some(isLK);
      if (lkA || lkB) {
        lastLkWithVasu = (vasuA && lkA) || (vasuB && lkB);
        break;
      }
    }

    const probWithVasu = lastLkWithVasu === true ? 0.25 : lastLkWithVasu === false ? 0.75 : 0.5;
    return {
      lkTargetSameAsVasu: Math.random() < probWithVasu,
      srinivasTargetSameAsVasu: null,
      lkSrinivasTargetSameTeam: null,
    };
  }

  // Only Srinivas is present
  if (hasSrinivas) {
    let lastSrWithVasu: boolean | null = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (!m.teamA || !m.teamB) continue;
      const vasuA = m.teamA.players.some(isVasu);
      const vasuB = m.teamB.players.some(isVasu);
      if (!vasuA && !vasuB) continue;
      const srA = m.teamA.players.some(isSrinivas);
      const srB = m.teamB.players.some(isSrinivas);
      if (srA || srB) {
        lastSrWithVasu = (vasuA && srA) || (vasuB && srB);
        break;
      }
    }

    const probWithVasu = lastSrWithVasu === true ? 0.25 : lastSrWithVasu === false ? 0.75 : 0.5;
    return {
      lkTargetSameAsVasu: null,
      srinivasTargetSameAsVasu: Math.random() < probWithVasu,
      lkSrinivasTargetSameTeam: null,
    };
  }

  return {
    lkTargetSameAsVasu: null,
    srinivasTargetSameAsVasu: null,
    lkSrinivasTargetSameTeam: null,
  };
}

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
  const hasSuresh = pool.some(isSuresh);
  const hasVinod = pool.some(isVinod);
  const hasRK = pool.some(isRK);
  const hasAnurupam = pool.some(isAnurupam);
  const hasLK = pool.some(isLK);
  const hasSrinivas = pool.some(isSrinivas);
  const hasShiva = pool.some(isShiva);

  // Available slots on Vasu's team for optional/probabilistic players
  const mandatoryInVasuTeam = (hasVasu ? 1 : 0) + (hasSuresh && hasVasu ? 1 : 0) + (hasVinod && hasVasu ? 1 : 0);
  const vasuSlots = Math.max(0, teamASize - mandatoryInVasuTeam);

  // Targets for LK & Srinivas
  const lkSrTargets = determineLKSrinivasTargets(history, hasVasu, hasLK, hasSrinivas, vasuSlots);

  // Capacity allocation for RK and Anurupam on Vasu's team
  let slotsUsedInVasu = 0;
  if (lkSrTargets.lkTargetSameAsVasu === true) slotsUsedInVasu++;
  if (lkSrTargets.srinivasTargetSameAsVasu === true) slotsUsedInVasu++;

  const remainingForRkAnu = Math.max(0, vasuSlots - slotsUsedInVasu);

  // Probabilistic 5/6 (83.33%) targets for RK and Anurupam to be in Vasu's team
  let rkTargetSame: boolean | null = null;
  let anurupamTargetSame: boolean | null = null;

  if (hasRK && hasVasu) {
    if (remainingForRkAnu >= 1) {
      rkTargetSame = Math.random() < 5 / 6;
    } else {
      rkTargetSame = false;
    }
  }

  if (hasAnurupam && hasVasu) {
    const slotsLeft = remainingForRkAnu - (rkTargetSame === true ? 1 : 0);
    if (slotsLeft >= 1) {
      anurupamTargetSame = Math.random() < 5 / 6;
    } else {
      anurupamTargetSame = false;
    }
  }

  // Srinivas vs Shiva: same team 1 out of 3 matches (2 out of 3 opposite)
  const srinivasShivaOpposite = determineSrinivasShivaOppositeTarget(history, hasSrinivas, hasShiva);

  // Ashok vs Vasu: same team 2 out of 5 matches (3 out of 5 opposite)
  const hasAshok = pool.some(isAshok);
  const ashokVasuSame = determineAshokVasuSameTarget(history, hasAshok, hasVasu);

  const targets = {
    rkTargetSame,
    anurupamTargetSame,
    srinivasShivaOpposite,
    ashokVasuSame,
    lkTargetSameAsVasu: lkSrTargets.lkTargetSameAsVasu,
    srinivasTargetSameAsVasu: lkSrTargets.srinivasTargetSameAsVasu,
    lkSrinivasTargetSameTeam: lkSrTargets.lkSrinivasTargetSameTeam,
  };

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

  // Strictly ensure Vasu is never captain
  const safeCaptainA = isVasu(captainA)
    ? bestSplit.teamA.find((p) => !isVasu(p)) || captainA
    : captainA;
  const safeCaptainB = isVasu(captainB)
    ? bestSplit.teamB.find((p) => !isVasu(p)) || captainB
    : captainB;

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
    captainId: safeCaptainA.id,
    captainName: safeCaptainA.name,
    name: `${safeCaptainA.name.toUpperCase()}'S TEAM`,
    players: bestSplit.teamA,
    roleSummary: summaryA,
  };

  const teamB: Team = {
    id: 'teamB',
    captainId: safeCaptainB.id,
    captainName: safeCaptainB.name,
    name: `${safeCaptainB.name.toUpperCase()}'S TEAM`,
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
    srinivasShivaOpposite: boolean | null;
    ashokVasuSame: boolean | null;
    lkTargetSameAsVasu: boolean | null;
    srinivasTargetSameAsVasu: boolean | null;
    lkSrinivasTargetSameTeam: boolean | null;
  },
  enforceProbabilistic: boolean = true
): boolean {
  // 0. Strict 50/50 capacity distribution to prevent bias:
  // Strike Bowlers, Top Batters, Spinners, and Pace Bowlers must be evenly split
  const strikeA = candidateA.filter(isStrikeBowler).length;
  const strikeB = candidateB.filter(isStrikeBowler).length;
  if (Math.abs(strikeA - strikeB) > 1) {
    return false;
  }

  const topBatA = candidateA.filter(isTopBatter).length;
  const topBatB = candidateB.filter(isTopBatter).length;
  if (Math.abs(topBatA - topBatB) > 1) {
    return false;
  }

  const spinA = candidateA.filter(isSpinBowler).length;
  const spinB = candidateB.filter(isSpinBowler).length;
  if (Math.abs(spinA - spinB) > 1) {
    return false;
  }

  const paceA = candidateA.filter(isPaceBowler).length;
  const paceB = candidateB.filter(isPaceBowler).length;
  if (Math.abs(paceA - paceB) > 1) {
    return false;
  }

  // Support Cluster (LK Sir, Ranjit Sir, Shiva Sir, Rajarao Sir, Ashok Sir) must NOT all be in the same team
  // Split them 50/50 and ensure neither team is dominated by 4 or more of them
  const supportA = candidateA.filter(isSupportClusterPlayer).length;
  const supportB = candidateB.filter(isSupportClusterPlayer).length;
  if (supportA >= 4 || supportB >= 4) {
    return false;
  }
  if (Math.abs(supportA - supportB) > 1) {
    return false;
  }

  // Guarantee that neither team is left without a proper Top Batter or Strike Bowler
  const totalTop = topBatA + topBatB;
  if (totalTop >= 2 && (topBatA === 0 || topBatB === 0)) {
    return false;
  }

  const totalStrike = strikeA + strikeB;
  if (totalStrike >= 2 && (strikeA === 0 || strikeB === 0)) {
    return false;
  }

  // 1. Srinivas & Shiva: 4 times opposite in 4/6 matches
  const srinivasInA = candidateA.some(isSrinivas);
  const srinivasInB = candidateB.some(isSrinivas);
  const shivaInA = candidateA.some(isShiva);
  const shivaInB = candidateB.some(isShiva);

  if ((srinivasInA || srinivasInB) && (shivaInA || shivaInB)) {
    const areOpposite = (srinivasInA && shivaInB) || (srinivasInB && shivaInA);
    if (targets.srinivasShivaOpposite !== null) {
      if (areOpposite !== targets.srinivasShivaOpposite) {
        return false;
      }
    }
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

  // 5. LK Sir & Srinivas Sir same team target
  const lkInA = candidateA.some(isLK);
  const lkInB = candidateB.some(isLK);

  if ((lkInA || lkInB) && (srinivasInA || srinivasInB)) {
    const lkSrSame = (lkInA && srinivasInA) || (lkInB && srinivasInB);
    if (targets.lkSrinivasTargetSameTeam !== null && enforceProbabilistic) {
      if (lkSrSame !== targets.lkSrinivasTargetSameTeam) {
        return false;
      }
    }
  }

  // 6. LK & Srinivas frequently change in Vasu's team
  if (enforceProbabilistic && (vasuInA || vasuInB)) {
    if (targets.lkTargetSameAsVasu !== null && (lkInA || lkInB)) {
      const lkSameWithVasu = (lkInA && vasuInA) || (lkInB && vasuInB);
      if (lkSameWithVasu !== targets.lkTargetSameAsVasu) {
        return false;
      }
    }

    if (targets.srinivasTargetSameAsVasu !== null && (srinivasInA || srinivasInB)) {
      const srSameWithVasu = (srinivasInA && vasuInA) || (srinivasInB && vasuInB);
      if (srSameWithVasu !== targets.srinivasTargetSameAsVasu) {
        return false;
      }
    }

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

    // Ashok with Vasu 2 out of 5 times (3 out of 5 opposite)
    if (targets.ashokVasuSame !== null) {
      const ashokInA = candidateA.some(isAshok);
      const ashokInB = candidateB.some(isAshok);
      if (ashokInA || ashokInB) {
        const isSame = (ashokInA && vasuInA) || (ashokInB && vasuInB);
        if (isSame !== targets.ashokVasuSame) {
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
