import type { PlayerMatchStat } from '../types/match';

export interface PerformanceRatingResult {
  impactScore: number;
  battingScore: number;
  bowlingScore: number;
  fieldingScore: number;
  certifications: string[];
}

export function calculatePlayerPerformance(stat: PlayerMatchStat): PerformanceRatingResult {
  let battingScore = 0;
  let bowlingScore = 0;
  let fieldingScore = 0;
  const certifications: string[] = [];

  // 1. Batting Rating
  const runs = stat.runsScored || 0;
  const balls = stat.ballsFaced || 0;
  battingScore += runs * 1.2;
  battingScore += (stat.fours || 0) * 2;
  battingScore += (stat.sixes || 0) * 4;

  if (balls >= 5) {
    const sr = (runs / balls) * 100;
    if (sr >= 150) battingScore += 10;
    else if (sr >= 120) battingScore += 5;
  }

  if (runs >= 50) battingScore += 25;
  else if (runs >= 25) battingScore += 12;

  // 2. Bowling Rating
  const wickets = stat.wicketsTaken || 0;
  const dots = stat.dotBalls || 0;
  const overs = stat.oversBowled || 0;
  const runsConceded = stat.runsConceded || 0;

  bowlingScore += wickets * 25;
  bowlingScore += dots * 2.5;

  if (wickets >= 3) bowlingScore += 20;

  if (overs >= 2 && runsConceded > 0) {
    const economy = runsConceded / overs;
    if (economy <= 6.0) bowlingScore += 15;
    else if (economy <= 8.0) bowlingScore += 8;
  }

  // 3. Fielding Rating
  const catches = stat.catches || 0;
  const stumpings = stat.stumpings || 0;
  const runOuts = stat.runOuts || 0;
  fieldingScore += catches * 10 + stumpings * 12 + runOuts * 12;

  const impactScore = Math.round(battingScore + bowlingScore + fieldingScore);

  // Determine Certifications
  if (battingScore >= 35 || runs >= 25) {
    certifications.push('⭐ Certified Star Batsman');
  }
  if (bowlingScore >= 35 || wickets >= 2 || dots >= 8) {
    certifications.push('🎯 Certified Bowling Master');
  }
  if (fieldingScore >= 20 || catches >= 2) {
    certifications.push('🛡️ Certified Field Marshal');
  }
  if (runs >= 15 && wickets >= 1) {
    certifications.push('🏅 Certified All-Round Maestro');
  }

  return {
    impactScore,
    battingScore: Math.round(battingScore),
    bowlingScore: Math.round(bowlingScore),
    fieldingScore: Math.round(fieldingScore),
    certifications,
  };
}
