export type PlayerRole =
  | 'All-rounder'
  | 'Pace Bowler'
  | 'Medium Pacer'
  | 'Spinner'
  | 'Leg Spinner'
  | 'Batsman'
  | 'Wicketkeeper';

export interface Player {
  id: string;
  name: string;
  roles: PlayerRole[];
  isRegular: boolean;
  isActive: boolean;
  rating?: number; // Optional numerical rating for advanced tuning
  createdAt: string;
}
