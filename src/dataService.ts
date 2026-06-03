/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, supabaseAdmin } from './supabase';
import { Player, Question, Answer, LeaderboardRow, LeaderboardInfo, ScreenState } from './types';

// Storage keys for local simulation
const STORAGE_KEYS = {
  PLAYERS: 'trivia_demo_players',
  QUESTIONS: 'trivia_demo_questions',
  ANSWERS: 'trivia_demo_answers',
  DEMO_MODE: 'trivia_use_demo_mode',
  LEADERBOARDS: 'trivia_demo_leaderboards',
  ACTIVE_LEADERBOARD_ID: 'trivia_active_leaderboard_id'
};

// Default seed leaderboards if empty
const DEFAULT_LEADERBOARDS: LeaderboardInfo[] = [
  {
    id: 'default',
    name: 'Trivia Principal',
    status: 'registration',
    created_at: new Date().toISOString()
  }
];

export function fetchLeaderboards(): LeaderboardInfo[] {
  const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARDS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARDS, JSON.stringify(DEFAULT_LEADERBOARDS));
    return DEFAULT_LEADERBOARDS;
  }
  return JSON.parse(data);
}

export function saveLeaderboards(list: LeaderboardInfo[]) {
  localStorage.setItem(STORAGE_KEYS.LEADERBOARDS, JSON.stringify(list));
  window.dispatchEvent(new Event('simulated-database-update'));
}

export function getActiveLeaderboardId(): string {
  let activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEADERBOARD_ID);
  if (!activeId) {
    const boards = fetchLeaderboards();
    activeId = boards[0]?.id || 'default';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LEADERBOARD_ID, activeId);
  }
  return activeId;
}

export function setActiveLeaderboardId(id: string) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_LEADERBOARD_ID, id);
  window.dispatchEvent(new Event('simulated-database-update'));
}

export function getActiveLeaderboard(): LeaderboardInfo {
  const boards = fetchLeaderboards();
  const currentId = getActiveLeaderboardId();
  return boards.find(b => b.id === currentId) || boards[0] || DEFAULT_LEADERBOARDS[0];
}

export function createLeaderboard(name: string, prize_title: string = ''): LeaderboardInfo {
  const boards = fetchLeaderboards();
  const newBoard: LeaderboardInfo = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Nuevo Leaderboard',
    status: 'registration',
    created_at: new Date().toISOString(),
    prize_title: prize_title.trim()
  };
  boards.push(newBoard);
  saveLeaderboards(boards);
  setActiveLeaderboardId(newBoard.id);
  return newBoard;
}

export function deleteLeaderboard(id: string): boolean {
  if (id === 'default') return false;
  const boards = fetchLeaderboards();
  const filtered = boards.filter(b => b.id !== id);
  saveLeaderboards(filtered);
  
  const activeId = getActiveLeaderboardId();
  if (activeId === id) {
    setActiveLeaderboardId('default');
  }
  return true;
}

export function updateLeaderboardStatus(id: string, status: ScreenState) {
  const boards = fetchLeaderboards();
  const updated = boards.map(b => b.id === id ? { ...b, status } : b);
  saveLeaderboards(updated);
}


// Seed initial questions if they don't exist
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: '¿Cuál es el planeta más grande de nuestro sistema solar?',
    option_a: 'Tierra',
    option_b: 'Júpiter',
    option_c: 'Marte',
    option_d: 'Saturno',
    correct_option: 'b',
    xp_value: 500,
    time_limit_seconds: 15,
    order_index: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'q2',
    question: '¿Qué elemento químico tiene el símbolo "O" en la tabla periódica?',
    option_a: 'Oro',
    option_b: 'Osmio',
    option_c: 'Oxígeno',
    option_d: 'Hierro',
    correct_option: 'c',
    xp_value: 300,
    time_limit_seconds: 10,
    order_index: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'q3',
    question: '¿Cuál es la capital de Japón?',
    option_a: 'Pekín',
    option_b: 'Kioto',
    option_c: 'Seúl',
    option_d: 'Tokio',
    correct_option: 'd',
    xp_value: 400,
    time_limit_seconds: null,
    order_index: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'q4',
    question: '¿En qué año el hombre pisó la Luna por primera vez?',
    option_a: '1969',
    option_b: '1975',
    option_c: '1959',
    option_d: '1965',
    correct_option: 'a',
    xp_value: 600,
    time_limit_seconds: 20,
    order_index: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'q5',
    question: '¿Cuál es el océano más grande del mundo?',
    option_a: 'Océano Índico',
    option_b: 'Océano Pacífico',
    option_c: 'Océano Atlántico',
    option_d: 'Océano Ártico',
    correct_option: 'b',
    xp_value: 500,
    time_limit_seconds: 15,
    order_index: 5,
    created_at: new Date().toISOString()
  }
];

// Helper to check if demo mode should be used
export function isDemoMode(): boolean {
  if (!supabase) return true;
  const forceDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
  return forceDemo === 'true';
}

export function setDemoMode(active: boolean) {
  localStorage.setItem(STORAGE_KEYS.DEMO_MODE, active ? 'true' : 'false');
  window.location.reload();
}

// Low-level helper to load simulated data
function getSimulatedPlayers(): Player[] {
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  const activeId = getActiveLeaderboardId();
  const allPlayers: Player[] = data ? JSON.parse(data) : [];
  return allPlayers.filter(p => p.leaderboard_id === activeId || (activeId === 'default' && !p.leaderboard_id));
}

function saveSimulatedPlayers(playersOfActiveLeaderboard: Player[]) {
  const activeId = getActiveLeaderboardId();
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  const allPlayers: Player[] = data ? JSON.parse(data) : [];
  
  const otherPlayers = allPlayers.filter(p => p.leaderboard_id !== activeId && !(activeId === 'default' && !p.leaderboard_id));
  const updatedPlayers = playersOfActiveLeaderboard.map(p => ({ ...p, leaderboard_id: activeId }));
  
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([...otherPlayers, ...updatedPlayers]));
  // Emit storage event for same-window updates in simulated realtime
  window.dispatchEvent(new Event('simulated-database-update'));
}

export function getSimulatedQuestions(): Question[] {
  const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  const activeId = getActiveLeaderboardId();
  
  let allQs: Question[] = [];
  if (!data) {
    const seeded = DEFAULT_QUESTIONS.map(q => ({ ...q, leaderboard_id: 'default' }));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(seeded));
    allQs = seeded;
  } else {
    allQs = JSON.parse(data);
  }
  
  return allQs.filter(q => q.leaderboard_id === activeId || (activeId === 'default' && !q.leaderboard_id));
}

function saveSimulatedQuestions(questionsOfActiveLeaderboard: Question[]) {
  const activeId = getActiveLeaderboardId();
  const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  const allQs: Question[] = data ? JSON.parse(data) : [];
  
  const otherQs = allQs.filter(q => q.leaderboard_id !== activeId && !(activeId === 'default' && !q.leaderboard_id));
  const updatedQs = questionsOfActiveLeaderboard.map(q => ({ ...q, leaderboard_id: activeId }));
  
  const finalMerged = [...otherQs, ...updatedQs];
  const sorted = [...finalMerged].sort((a, b) => a.order_index - b.order_index);
  
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(sorted));
}

function getSimulatedAnswers(): Answer[] {
  const data = localStorage.getItem(STORAGE_KEYS.ANSWERS);
  const activeId = getActiveLeaderboardId();
  const allAnswers: Answer[] = data ? JSON.parse(data) : [];
  return allAnswers.filter(a => a.leaderboard_id === activeId || (activeId === 'default' && !a.leaderboard_id));
}

function saveSimulatedAnswers(answersOfActiveLeaderboard: Answer[]) {
  const activeId = getActiveLeaderboardId();
  const data = localStorage.getItem(STORAGE_KEYS.ANSWERS);
  const allAnswers: Answer[] = data ? JSON.parse(data) : [];
  
  const otherAnswers = allAnswers.filter(a => a.leaderboard_id !== activeId && !(activeId === 'default' && !a.leaderboard_id));
  const updatedAnswers = answersOfActiveLeaderboard.map(a => ({ ...a, leaderboard_id: activeId }));
  
  localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify([...otherAnswers, ...updatedAnswers]));
  window.dispatchEvent(new Event('simulated-database-update'));
}

// API Methods
export async function fetchQuestions(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<Question[]> {
  if (isDemoMode()) {
    return getSimulatedQuestions();
  }

  try {
    const { data, error } = await supabase!
      .from('questions')
      .select('*')
      .eq('leaderboard_id', leaderboardId)
      .order('order_index', { ascending: true });

    if (error) {
      // Fallback without parameter in case this is a legacy setup
      const { data: fallback, error: err2 } = await supabase!
        .from('questions')
        .select('*')
        .order('order_index', { ascending: true });
      if (err2) throw err2;
      return fallback || [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching questions from Supabase, reverting to simulation:', error);
    return getSimulatedQuestions();
  }
}

export function sortAndConsecutiveRank(rows: any[]): LeaderboardRow[] {
  const mapped = rows.map((r, idx) => ({
    player_id: r.player_id,
    name: r.name || r.player_name || 'Jugador Anónimo',
    player_name: r.player_name || r.name || 'Jugador Anónimo',
    total_xp: Number(r.total_xp || 0),
    correct_answers: Number(r.correct_answers || 0),
    total_answers: Number(r.total_answers || 0),
    rank: Number(r.rank || idx + 1),
    last_answer_at: r.last_answer_at || r.created_at || new Date().toISOString()
  }));

  mapped.sort((a, b) => {
    if (b.total_xp !== a.total_xp) {
      return b.total_xp - a.total_xp;
    }
    const timeA = new Date(a.last_answer_at).getTime();
    const timeB = new Date(b.last_answer_at).getTime();
    return timeA - timeB;
  });

  return mapped.map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}

export async function fetchLeaderboard(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<LeaderboardRow[]> {
  if (isDemoMode()) {
    return calculateSimulatedLeaderboard(leaderboardId);
  }

  try {
    // Note: Try 'leaderboard_results' view first for the active leaderboard
    const { data, error } = await supabase!
      .from('leaderboard_results')
      .select('*')
      .eq('leaderboard_id', leaderboardId);

    if (!error && data && data.length > 0) {
      return sortAndConsecutiveRank(data);
    }

    // Try normal 'leaderboard' view fallback
    const { data: fbData, error: fbError } = await supabase!
      .from('leaderboard')
      .select('*')
      .eq('leaderboard_id', leaderboardId);

    if (fbError) {
      // Try 'leaderboard_results' fallback but without eq filter (last resort)
      const { data: fbData2, error: fbError2 } = await supabase!
        .from('leaderboard_results')
        .select('*');
      if (fbError2) throw fbError2;
      const filtered = (fbData2 || []).filter(r => r.leaderboard_id === leaderboardId);
      return sortAndConsecutiveRank(filtered);
    }
    
    return sortAndConsecutiveRank(fbData || []);
  } catch (error) {
    console.error('Error fetching leaderboard from Supabase, reverting to simulation:', error);
    return calculateSimulatedLeaderboard(leaderboardId);
  }
}

export async function registerPlayer(name: string, leaderboardId: string = getActiveLeaderboardId()): Promise<Player> {
  const trimmedName = name.trim().slice(0, 50) || 'Jugador Anónimo';
  const newPlayer: Player = {
    id: crypto.randomUUID(),
    name: trimmedName,
    created_at: new Date().toISOString(),
    leaderboard_id: leaderboardId
  };

  if (isDemoMode()) {
    const players = getSimulatedPlayers();
    players.push(newPlayer);
    saveSimulatedPlayers(players);
    return newPlayer;
  }

  try {
    const { data, error } = await supabase!
      .from('players')
      .insert({ id: newPlayer.id, name: trimmedName, leaderboard_id: leaderboardId })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registering player in Supabase, saving locally:', error);
    // Fallback: register locally
    const players = getSimulatedPlayers();
    players.push(newPlayer);
    saveSimulatedPlayers(players);
    return newPlayer;
  }
}

export async function submitAnswer(
  playerId: string,
  questionId: string,
  selectedOption: 'a' | 'b' | 'c' | 'd',
  isCorrect: boolean,
  xpEarned: number,
  leaderboardId: string = getActiveLeaderboardId()
): Promise<Answer> {
  const newAnswer: Answer = {
    id: crypto.randomUUID(),
    player_id: playerId,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: isCorrect,
    xp_earned: xpEarned,
    answered_at: new Date().toISOString(),
    leaderboard_id: leaderboardId
  };

  if (isDemoMode()) {
    const answers = getSimulatedAnswers();
    // UNIQUE constraint on player_id, question_id
    const filteredAnswers = answers.filter(a => !(a.player_id === playerId && a.question_id === questionId));
    filteredAnswers.push(newAnswer);
    saveSimulatedAnswers(filteredAnswers);
    return newAnswer;
  }

  try {
    const { data, error } = await supabase!
      .from('answers')
      .upsert({
        player_id: playerId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        xp_earned: xpEarned,
        answered_at: newAnswer.answered_at,
        leaderboard_id: leaderboardId
      }, {
        onConflict: 'player_id,question_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting answer to Supabase, saving locally:', error);
    // Fallback to local answering
    const answers = getSimulatedAnswers();
    const filteredAnswers = answers.filter(a => !(a.player_id === playerId && a.question_id === questionId));
    filteredAnswers.push(newAnswer);
    saveSimulatedAnswers(filteredAnswers);
    return newAnswer;
  }
}

export async function addQuestion(q: Omit<Question, 'id' | 'created_at'>, leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<Question> {
  const newQ: Question = {
    ...q,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    leaderboard_id: leaderboardId
  };

  if (isDemoMode()) {
    const questions = getSimulatedQuestions();
    questions.push(newQ);
    saveSimulatedQuestions(questions);
    return newQ;
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('questions')
      .insert({
        id: newQ.id,
        leaderboard_id: leaderboardId,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        xp_value: q.xp_value,
        time_limit_seconds: q.time_limit_seconds,
        order_index: q.order_index
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding question to Supabase, adding locally:', error);
    const questions = getSimulatedQuestions();
    questions.push(newQ);
    saveSimulatedQuestions(questions);
    return newQ;
  }
}

export async function updateQuestion(id: string, q: Partial<Question>): Promise<Question> {
  if (isDemoMode()) {
    const questions = getSimulatedQuestions();
    const updated = questions.map(item => item.id === id ? { ...item, ...q } : item);
    saveSimulatedQuestions(updated);
    const target = updated.find(item => item.id === id);
    if (!target) throw new Error('Question not found');
    return target;
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('questions')
      .update({
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        xp_value: q.xp_value,
        time_limit_seconds: q.time_limit_seconds,
        order_index: q.order_index
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating question in Supabase, updating locally:', error);
    const questions = getSimulatedQuestions();
    const updated = questions.map(item => item.id === id ? { ...item, ...q } : item);
    saveSimulatedQuestions(updated);
    const target = updated.find(item => item.id === id);
    if (!target) throw new Error('Question not found');
    return target;
  }
}

export async function deleteQuestion(id: string): Promise<boolean> {
  if (isDemoMode()) {
    const questions = getSimulatedQuestions();
    const filtered = questions.filter(q => q.id !== id);
    saveSimulatedQuestions(filtered);
    return true;
  }

  try {
    const { error } = await supabaseAdmin!
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting question from Supabase, removing locally:', error);
    const questions = getSimulatedQuestions();
    const filtered = questions.filter(q => q.id !== id);
    saveSimulatedQuestions(filtered);
    return true;
  }
}

export async function resetEventData(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<boolean> {
  if (isDemoMode()) {
    const players = getSimulatedPlayers().filter(p => p.leaderboard_id !== leaderboardId);
    const answers = getSimulatedAnswers().filter(a => a.leaderboard_id !== leaderboardId);
    saveSimulatedPlayers(players);
    saveSimulatedAnswers(answers);
    return true;
  }

  try {
    // Delete answers and players using active leaderboard id rule
    const { error: answersError } = await supabaseAdmin!
      .from('answers')
      .delete()
      .eq('leaderboard_id', leaderboardId);

    if (answersError) throw answersError;

    const { error: playersError } = await supabaseAdmin!
      .from('players')
      .delete()
      .eq('leaderboard_id', leaderboardId);

    if (playersError) throw playersError;
    return true;
  } catch (error) {
    console.error('Error resetting event in Supabase, resetting locally:', error);
    const players = getSimulatedPlayers().filter(p => p.leaderboard_id !== leaderboardId);
    const answers = getSimulatedAnswers().filter(a => a.leaderboard_id !== leaderboardId);
    saveSimulatedPlayers(players);
    saveSimulatedAnswers(answers);
    return true;
  }
}

export async function finalizePlayerResults(
  playerId: string,
  totalXP: number,
  totalCorrect: number,
  leaderboardId: string
): Promise<boolean> {
  if (isDemoMode()) {
    // Simulated: just flag player as finished locally
    return true;
  }

  try {
    // In a real database, you might update a 'results' table or 'players' table
    // For now, ensure we have a record that this player finished with these stats
    const { error } = await supabase!
      .from('player_final_results')
      .upsert({
        player_id: playerId,
        leaderboard_id: leaderboardId,
        total_xp: totalXP,
        correct_answers: totalCorrect,
        finished_at: new Date().toISOString()
      }, {
        onConflict: 'player_id,leaderboard_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error finalizing results in Supabase:', error);
    return false;
  }
}

function applyTexacoOverride<T extends { name?: string; description?: string; theme_primary?: string; theme_secondary?: string; primary_color?: string; secondary_color?: string; prize_top_n?: number } | null | undefined>(board: T): T {
  if (!board) return board;
  let res = { ...board };
  const name = res.name || '';
  const desc = res.description || '';
  
  if (name.toLowerCase().includes('texaco') || desc.toLowerCase().includes('texaco')) {
    res.primary_color = '#d03730';
    res.secondary_color = '#111211';
    res.theme_primary = '#d03730';
    res.theme_secondary = '#111211';
  }
  
  if (name.toLowerCase().includes('salvador') || desc.toLowerCase().includes('salvador')) {
    if (res.prize_top_n === undefined || res.prize_top_n === null) {
      res.prize_top_n = 2;
    }
  }
  
  return res;
}

export async function fetchActiveLeaderboardInfo(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<LeaderboardInfo | null> {
  const targetId = leaderboardId === 'default' ? '00000000-0000-0000-0000-000000000001' : leaderboardId;

  if (isDemoMode()) {
    const list = fetchLeaderboards();
    const board = list.find(b => b.id === targetId || (targetId === '00000000-0000-0000-0000-000000000001' && b.id === 'default'));
    return applyTexacoOverride(board ? { ...board, id: targetId } : {
      id: targetId,
      name: 'Trivia Event Principal',
      status: 'active' as any,
      created_at: new Date().toISOString()
    });
  }
  try {
    const { data, error } = await supabase!
      .from('leaderboards')
      .select('*')
      .eq('id', targetId)
      .single();
    if (error) {
      console.warn('Metadata view or table leaderboards failed, using fallback:', error);
      const fallbackResult = {
        id: targetId,
        name: 'Trivia Event Principal (Fallback)',
        status: 'active' as any,
        created_at: new Date().toISOString()
      };
      // Merge local theme fallback
      try {
        const storedThemesStr = localStorage.getItem('trivia_custom_themes');
        if (storedThemesStr) {
          const storedThemes = JSON.parse(storedThemesStr);
          if (storedThemes[targetId]) {
            return applyTexacoOverride({ ...fallbackResult, ...storedThemes[targetId] });
          }
        }
      } catch (e) {}
      return applyTexacoOverride(fallbackResult);
    }

    const mapped = data ? {
      ...data,
      theme_primary: data.primary_color || data.theme_primary,
      theme_secondary: data.secondary_color || data.theme_secondary,
      theme_card_bg: data.background_color || data.theme_card_bg || 'light',
    } : null;

    // Merge theme colors from local storage override as a robust fallback
    try {
      const storedThemesStr = localStorage.getItem('trivia_custom_themes');
      if (storedThemesStr && mapped) {
        const storedThemes = JSON.parse(storedThemesStr);
        if (storedThemes[targetId]) {
          return applyTexacoOverride({
            ...mapped,
            ...storedThemes[targetId]
          });
        }
      }
    } catch (e) {
      console.warn(e);
    }

    return applyTexacoOverride(mapped);
  } catch (err) {
    const fallbackResult = {
      id: targetId,
      name: 'Trivia Event Principal (Fallback)',
      status: 'active' as any,
      created_at: new Date().toISOString()
    };
    try {
      const storedThemesStr = localStorage.getItem('trivia_custom_themes');
      if (storedThemesStr) {
        const storedThemes = JSON.parse(storedThemesStr);
        if (storedThemes[targetId]) {
          return applyTexacoOverride({ ...fallbackResult, ...storedThemes[targetId] });
        }
      }
    } catch (e) {}
    return applyTexacoOverride(fallbackResult);
  }
}

export async function updateLeaderboardDetailsSupabase(
  leaderboardId: string,
  updates: Partial<LeaderboardInfo>
): Promise<boolean> {
  const targetId = leaderboardId === 'default' ? '00000000-0000-0000-0000-000000000001' : leaderboardId;

  let finalUpdates: any = { ...updates };
  // Check if name contains 'texaco'
  const isTexaco = finalUpdates.name?.toLowerCase().includes('texaco') || 
                   finalUpdates.prize_description?.toLowerCase().includes('texaco');
  if (isTexaco) {
    finalUpdates.theme_primary = '#d03730';
    finalUpdates.theme_secondary = '#111211';
    finalUpdates.primary_color = '#d03730';
    finalUpdates.secondary_color = '#111211';
  }

  // Check if name contains 'salvador'
  const isSalvador = finalUpdates.name?.toLowerCase().includes('salvador') || 
                     finalUpdates.prize_description?.toLowerCase().includes('salvador');
  if (isSalvador) {
    if (finalUpdates.prize_top_n === undefined || finalUpdates.prize_top_n === null) {
      finalUpdates.prize_top_n = 2;
    }
  }

  if (isDemoMode()) {
    const list = fetchLeaderboards();
    const updated = list.map(b => {
      const checkId = b.id === 'default' ? '00000000-0000-0000-0000-000000000001' : b.id;
      if (checkId === targetId) {
        return { ...b, ...finalUpdates };
      }
      return b;
    });
    saveLeaderboards(updated);
    return true;
  }

  try {
    const client = supabaseAdmin || supabase;
    if (!client) throw new Error('No se pudo inicializar el cliente de Supabase.');

    // Separate standard columns we know are in table schema from any potential custom columns
    const standardFields: any = {
      name: finalUpdates.name,
      prize_title: finalUpdates.prize_title,
      prize_description: finalUpdates.prize_description,
      prize_image_url: finalUpdates.prize_image_url,
      prize_sponsor: finalUpdates.prize_sponsor,
      logo_url: finalUpdates.logo_url,
      background_image_url: finalUpdates.background_image_url,
      primary_color: finalUpdates.theme_primary,
      secondary_color: finalUpdates.theme_secondary,
      background_color: finalUpdates.theme_card_bg,
      prize_top_n: finalUpdates.prize_top_n,
    };

    // If there are theme colors, also save to local storage as a robust fallback
    if (finalUpdates.theme_primary || finalUpdates.theme_secondary || finalUpdates.theme_card_bg) {
      const storedThemesStr = localStorage.getItem('trivia_custom_themes') || '{}';
      const storedThemes = JSON.parse(storedThemesStr);
      storedThemes[targetId] = {
        ...(storedThemes[targetId] || {}),
        theme_primary: finalUpdates.theme_primary,
        theme_secondary: finalUpdates.theme_secondary,
        theme_card_bg: finalUpdates.theme_card_bg
      };
      localStorage.setItem('trivia_custom_themes', JSON.stringify(storedThemes));
    }

    // Try to update with standard fields (including themes now in the standard schema)
    const { error: standardError } = await client
      .from('leaderboards')
      .update(standardFields)
      .eq('id', targetId);

    if (standardError) throw standardError;

    return true;
  } catch (err) {
    console.error('Error updating leaderboard details:', err);
    return false;
  }
}

export async function updateActiveLeaderboardStatus(status: 'draft' | 'active' | 'finished', leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<boolean> {
  if (isDemoMode()) {
    const list = fetchLeaderboards();
    const updated = list.map(b => (b.id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && b.id === 'default')) ? { ...b, status: status as any } : b);
    saveLeaderboards(updated);
    return true;
  }
  try {
    const { error } = await supabaseAdmin!
      .from('leaderboards')
      .update({ status })
      .eq('id', leaderboardId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating status:', err);
    return false;
  }
}

export async function fetchAdminPlayersList(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<Player[]> {
  if (isDemoMode()) {
    return getSimulatedPlayers().filter(p => p.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !p.leaderboard_id));
  }
  try {
    const { data, error } = await supabase!
      .from('players')
      .select('id, name, created_at')
      .eq('leaderboard_id', leaderboardId)
      .order('created_at', { ascending: false });
    if (error) {
      // fallback
      const { data: fallback, error: err2 } = await supabase!
        .from('players')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (err2) throw err2;
      return fallback || [];
    }
    return data || [];
  } catch (err) {
    console.error('Error in fetchAdminPlayersList, reverting to simulated list:', err);
    return getSimulatedPlayers();
  }
}

export async function fetchPlayerAnswersDetail(playerId: string, leaderboardId: string = '00000000-0000-0000-0000-000000000001'): Promise<Answer[]> {
  if (isDemoMode()) {
    const answers = getSimulatedAnswers();
    return answers.filter(a => a.player_id === playerId);
  }
  try {
    const { data, error } = await supabase!
      .from('answers')
      .select('selected_option, is_correct, xp_earned, answered_at, question_id')
      .eq('player_id', playerId)
      .eq('leaderboard_id', leaderboardId);
    if (error) {
      const { data: fallback, error: err2 } = await supabase!
        .from('answers')
        .select('selected_option, is_correct, xp_earned, answered_at, question_id')
        .eq('player_id', playerId);
      if (err2) throw err2;
      return fallback || [];
    }
    return data || [];
  } catch (err) {
    console.error('Error in fetchPlayerAnswersDetail:', err);
    return [];
  }
}

export async function fetchLeaderboardsSupabase(): Promise<LeaderboardInfo[]> {
  const mergeLocalThemes = (list: LeaderboardInfo[]) => {
    try {
      const storedThemesStr = localStorage.getItem('trivia_custom_themes');
      if (storedThemesStr) {
        const storedThemes = JSON.parse(storedThemesStr);
        return list.map(item => {
          const checkId = item.id === 'default' ? '00000000-0000-0000-0000-000000000001' : item.id;
          if (storedThemes[checkId]) {
            return { ...item, ...storedThemes[checkId] };
          }
          return item;
        });
      }
    } catch (e) {}
    return list;
  };

  if (isDemoMode()) {
    const raw = fetchLeaderboards().map(b => ({
      id: b.id === 'default' ? '00000000-0000-0000-0000-000000000001' : b.id,
      name: b.name,
      status: b.status as any,
      created_at: b.created_at,
      prize_title: b.prize_title,
      prize_description: b.prize_description,
      prize_image_url: b.prize_image_url,
      prize_sponsor: b.prize_sponsor,
      prize_top_n: b.prize_top_n,
      logo_url: b.logo_url,
      background_image_url: b.background_image_url,
      theme_primary: b.theme_primary,
      theme_secondary: b.theme_secondary,
      theme_card_bg: b.theme_card_bg,
    }));
    return mergeLocalThemes(raw).map(applyTexacoOverride);
  }

  try {
    const { data, error } = await supabase!
      .from('leaderboards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map((b: any) => ({
      ...b,
      theme_primary: b.primary_color || b.theme_primary,
      theme_secondary: b.secondary_color || b.theme_secondary,
      theme_card_bg: b.background_color || b.theme_card_bg || 'light',
    }));
    return mergeLocalThemes(mapped).map(applyTexacoOverride);
  } catch (err) {
    console.warn('Failed to fetch leaderboards list from Supabase, returning simulated ones:', err);
    const raw = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Trivia Corporativa (Supabase)',
        status: 'active' as any,
        created_at: new Date().toISOString()
      }
    ];
    return mergeLocalThemes(raw).map(applyTexacoOverride);
  }
}

export async function createLeaderboardSupabase(
  name: string,
  description: string = '',
  prize_title: string = '',
  prize_description: string = '',
  prize_image_url: string = '',
  prize_sponsor: string = '',
  prize_top_n: number = 1,
  logo_url: string = '',
  background_image_url: string = ''
): Promise<LeaderboardInfo> {
  const newRow: LeaderboardInfo = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Nuevo Evento',
    status: 'draft' as any,
    created_at: new Date().toISOString(),
    prize_title: prize_title.trim(),
    prize_description: prize_description.trim(),
    prize_image_url: prize_image_url.trim(),
    prize_sponsor: prize_sponsor.trim(),
    prize_top_n: prize_top_n,
    logo_url: logo_url.trim(),
    background_image_url: background_image_url.trim()
  };

  if (isDemoMode()) {
    const list = fetchLeaderboards();
    list.push(newRow);
    saveLeaderboards(list);
    return applyTexacoOverride(newRow);
  }

  try {
    const client = supabaseAdmin || supabase;
    if (!client) throw new Error('No se pudo inicializar el cliente de Supabase.');

    const { data, error } = await client
      .from('leaderboards')
      .insert({
        id: newRow.id,
        name: newRow.name,
        description: description || 'Creado desde el panel de control',
        prize_title: newRow.prize_title,
        prize_description: newRow.prize_description,
        prize_image_url: newRow.prize_image_url,
        prize_sponsor: newRow.prize_sponsor,
        prize_top_n: newRow.prize_top_n,
        logo_url: newRow.logo_url,
        background_image_url: newRow.background_image_url,
        status: 'draft',
        created_at: newRow.created_at
      })
      .select()
      .single();

    if (error) {
       console.error('Supabase write error details:', error);
       throw error;
    }
    return applyTexacoOverride(data);
  } catch (err) {
    console.error('Error creating leaderboard in Supabase:', err);
    throw err;
  }
}

export interface AdminStats {
  totalPlayers: number;
  totalAnswers: number;
  completionPercentage: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  if (isDemoMode()) {
    return calculateSimulatedStats();
  }

  try {
    // Count total players
    const { count: playersCount, error: err1 } = await supabase!
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (err1) throw err1;

    // Count total answers
    const { count: answersCount, error: err2 } = await supabase!
      .from('answers')
      .select('*', { count: 'exact', head: true });

    if (err2) throw err2;

    // Calculate Completion Rate:
    // How many players solved ALL loaded questions
    const { data: questions, error: err3 } = await supabase!
      .from('questions')
      .select('id');

    if (err3) throw err3;

    const totalQuestionsCount = questions?.length || 0;
    let completionPercentage = 0;

    if (totalQuestionsCount > 0 && (playersCount || 0) > 0) {
      // Group answers by player_id and see who answered all
      const { data: answersGroup, error: err4 } = await supabase!
        .from('answers')
        .select('player_id');

      if (err4) throw err4;

      const playerAnswerCounts: Record<string, number> = {};
      (answersGroup || []).forEach(a => {
        playerAnswerCounts[a.player_id] = (playerAnswerCounts[a.player_id] || 0) + 1;
      });

      const finishedPlayersCount = Object.keys(playerAnswerCounts).filter(
        pid => playerAnswerCounts[pid] >= totalQuestionsCount
      ).length;

      completionPercentage = Math.round((finishedPlayersCount / (playersCount || 1)) * 100);
    }

    return {
      totalPlayers: playersCount || 0,
      totalAnswers: answersCount || 0,
      completionPercentage: Math.min(100, completionPercentage)
    };
  } catch (error) {
    console.error('Error fetching admin stats from Supabase, computing locally:', error);
    return calculateSimulatedStats();
  }
}

// Subscription for real-time leaderboard updates
export function subscribeToRealtimeAnswers(onAnswerInsert: () => void): () => void {
  if (isDemoMode()) {
    // Listening to internal browser storage update event
    const handleUpdate = () => {
      onAnswerInsert();
    };
    window.addEventListener('simulated-database-update', handleUpdate);
    return () => {
      window.removeEventListener('simulated-database-update', handleUpdate);
    };
  }

  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'temp',
          table: 'answers'
        },
        () => {
          onAnswerInsert();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Failed to subscribe to realtime channel:', e);
    return () => {};
  }
}

// Local simulation logic calculations
function calculateSimulatedLeaderboard(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): LeaderboardRow[] {
  const players = getSimulatedPlayers().filter(p => p.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !p.leaderboard_id));
  const answers = getSimulatedAnswers().filter(a => a.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !a.leaderboard_id));

  // Map of player_id to calculation record
  const map: Record<string, {
    player_id: string;
    name: string;
    player_name: string;
    total_xp: number;
    correct_answers: number;
    total_answers: number;
    last_answer_at: string;
  }> = {};

  players.forEach(p => {
    map[p.id] = {
      player_id: p.id,
      name: p.name,
      player_name: p.name,
      total_xp: 0,
      correct_answers: 0,
      total_answers: 0,
      last_answer_at: p.created_at
    };
  });

  answers.forEach(a => {
    // Just in case player was deleted/reset but answer stayed
    if (!map[a.player_id]) return;

    map[a.player_id].total_answers += 1;
    if (a.is_correct) {
      map[a.player_id].correct_answers += 1;
      map[a.player_id].total_xp += a.xp_earned;
    }
    if (a.answered_at > map[a.player_id].last_answer_at) {
      map[a.player_id].last_answer_at = a.answered_at;
    }
  });

  const list = Object.values(map);
  // Sort: highest XP first, then earliest last_answer_at
  list.sort((a, b) => {
    if (b.total_xp !== a.total_xp) {
      return b.total_xp - a.total_xp;
    }
    return new Date(a.last_answer_at).getTime() - new Date(b.last_answer_at).getTime();
  });

  return list.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

function calculateSimulatedStats(leaderboardId: string = '00000000-0000-0000-0000-000000000001'): AdminStats {
  const players = getSimulatedPlayers().filter(p => p.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !p.leaderboard_id));
  const answers = getSimulatedAnswers().filter(a => a.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !a.leaderboard_id));
  const questions = getSimulatedQuestions().filter(q => q.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !q.leaderboard_id));

  const totalQuestions = questions.length;
  let completionPercentage = 0;

  if (totalQuestions > 0 && players.length > 0) {
    const playerCounts: Record<string, number> = {};
    answers.forEach(a => {
      playerCounts[a.player_id] = (playerCounts[a.player_id] || 0) + 1;
    });

    const finished = Object.keys(playerCounts).filter(pid => playerCounts[pid] >= totalQuestions).length;
    completionPercentage = Math.round((finished / players.length) * 100);
  }

  return {
    totalPlayers: players.length,
    totalAnswers: answers.length,
    completionPercentage: Math.min(100, completionPercentage)
  };
}

// Generate fake player activity for engagement testing in the browser
export function insertMockCompetitor(name: string, accuracy = 0.7, leaderboardId: string = '00000000-0000-0000-0000-000000000001') {
  const tempP: Player = {
    id: crypto.randomUUID(),
    name,
    created_at: new Date().toISOString(),
    leaderboard_id: leaderboardId
  };

  // Add player
  const players = getSimulatedPlayers();
  players.push(tempP);
  saveSimulatedPlayers(players);

  // Instantly answer all questions with slight delays
  const questions = getSimulatedQuestions().filter(q => q.leaderboard_id === leaderboardId || (leaderboardId === '00000000-0000-0000-0000-000000000001' && !q.leaderboard_id));
  const answers = getSimulatedAnswers();

  questions.forEach((q, idx) => {
    const isCorrect = Math.random() < accuracy;
    const selected: 'a' | 'b' | 'c' | 'd' = isCorrect ? q.correct_option : (['a', 'b', 'c', 'd'].find(o => o !== q.correct_option) as any || 'a');
    
    const ans: Answer = {
      id: crypto.randomUUID(),
      player_id: tempP.id,
      question_id: q.id,
      selected_option: selected,
      is_correct: isCorrect,
      xp_earned: isCorrect ? q.xp_value : 0,
      answered_at: new Date(Date.now() - (questions.length - idx) * 3000).toISOString(),
      leaderboard_id: leaderboardId
    };
    answers.push(ans);
  });

  saveSimulatedAnswers(answers);
}
