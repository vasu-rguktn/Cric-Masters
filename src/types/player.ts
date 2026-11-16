export type PlayerRole =
  | 'All-rounder'
  | 'Pace Bowler'
  | 'Medium Pacer'
  | 'Spinner'
  | 'Leg Spinner'
  | 'Batsman'
  | 'Power Batter'
  | 'Strike Bowler'
  | 'Wicketkeeper';

export interface Player {
  id: string;
  name: string;
  roles: PlayerRole[];
  isRegular: boolean;
  isActive: boolean;
  isStrikeBowler?: boolean;
  isTopBatter?: boolean;
  avatarUrl?: string;
  rating?: number; // Optional numerical rating for advanced tuning
  createdAt: string;
}
