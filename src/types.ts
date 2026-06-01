/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string; // uuid
  name: string;
  created_at: string;
  leaderboard_id?: string;
}

export interface Question {
  id: string; // uuid
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  xp_value: number;
  time_limit_seconds: number | null;
  order_index: number;
  created_at: string;
  leaderboard_id?: string;
}

export interface Answer {
  id: string; // uuid
  player_id: string; // FK players
  question_id: string; // FK questions
  selected_option: 'a' | 'b' | 'c' | 'd';
  is_correct: boolean;
  xp_earned: number;
  answered_at: string;
  leaderboard_id?: string;
}

export interface LeaderboardRow {
  player_id: string;
  name: string;
  player_name: string;
  total_xp: number;
  correct_answers: number;
  total_answers: number;
  rank: number;
  last_answer_at: string;
}

export type ScreenState = 'registration' | 'trivia' | 'results';

export interface LeaderboardInfo {
  id: string;
  name: string;
  status: ScreenState;
  created_at: string;
  prize?: string; // Legacy
  prize_title?: string;
  prize_description?: string;
  prize_image_url?: string;
  prize_sponsor?: string;
  prize_top_n?: number;
  logo_url?: string;
  background_image_url?: string;
  theme_primary?: string;
  theme_secondary?: string;
  theme_card_bg?: string;
}
