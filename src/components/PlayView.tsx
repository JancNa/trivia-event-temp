/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Player, Question, Answer, LeaderboardRow, LeaderboardInfo } from '../types';
import { 
  fetchQuestions, 
  registerPlayer, 
  submitAnswer, 
  fetchLeaderboard,
  fetchLeaderboardsSupabase,
  fetchActiveLeaderboardInfo,
  finalizePlayerResults,
  isDemoMode
} from '../dataService';
import { supabase } from '../supabase';
import { 
  User, 
  Award, 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Sparkles, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Layout,
  ChevronRight,
  Database
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const ensureHex = (color?: string, fallback: string = "#fed600"): string => {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#")) return trimmed;
  if (/^[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return trimmed;
};

export default function PlayView() {
  // Screens: 'registration', 'trivia', 'results'
  const [screen, setScreen] = useState<'registration' | 'trivia' | 'results'>('registration');
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const { leaderboardId } = useParams<{ leaderboardId: string }>();
  const navigate = useNavigate();

  // Dynamic dynamic leaderboard selectors
  const [playLeaderboardId, setPlayLeaderboardId] = useState<string | null>(() => {
    if (leaderboardId) {
      localStorage.setItem('play_selected_leaderboard_id', leaderboardId);
      return leaderboardId;
    }
    return localStorage.getItem('play_selected_leaderboard_id');
  });
  const [leaderboardsList, setLeaderboardsList] = useState<LeaderboardInfo[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Form states
  const [playerName, setPlayerName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Trivia states
  const [player, setPlayer] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; xpEarned: number } | null>(null);
  const answersToSaveRef = useRef<Answer[]>([]);
  
  // Real-time Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Results states
  const [playerAnswers, setPlayerAnswers] = useState<Answer[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardInfo | null>(null);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);

  // Fetch available leaderboards
  const loadLeaderboardsList = async () => {
    setLoadingBoards(true);
    try {
      const list = await fetchLeaderboardsSupabase();
      setLeaderboardsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBoards(false);
    }
  };

  // 0. Load boards list on mount or when playLeaderboardId goes back to selection
  useEffect(() => {
    loadLeaderboardsList();
  }, [playLeaderboardId]);

  // 1. Initial State Check when leaderboard is selected
  useEffect(() => {
    if (!playLeaderboardId) {
      setLoading(false);
      return;
    }

    async function loadInitial() {
      setLoading(true);
      try {
        const board = await fetchActiveLeaderboardInfo(playLeaderboardId);
        setActiveLeaderboard(board);

        const storedId = localStorage.getItem(`trivia_player_id_${playLeaderboardId}`);
        const qList = await fetchQuestions(playLeaderboardId);
        setQuestions(qList);

        setPlayer(null);
        setScreen('registration');
      } catch (err) {
        console.error('Error in initial play setup:', err);
      } finally {
        setLoading(false);
      }
    }
    console.log('PlayView: running initial load for playLeaderboardId', playLeaderboardId);
    loadInitial();
  }, [playLeaderboardId]);

  // 2. Load ranking for results screen
  const loadRanking = async (pid: string, boardId: string = playLeaderboardId || '') => {
    if (!boardId) return;
    setLoadingRank(true);
    try {
      const rankList = await fetchLeaderboard(boardId);
      setLeaderboardRows(rankList);
      const pRow = rankList.find(r => r.player_id === pid);
      if (pRow) {
        setPlayerRank(pRow.rank);
      } else {
        setPlayerRank(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRank(false);
    }
  };

  // 3. Question timer handler
  useEffect(() => {
    if (screen === 'results' && player && playLeaderboardId) {
      const rankInterval = setInterval(() => {
        loadRanking(player.id, playLeaderboardId);
      }, 2000);
      return () => clearInterval(rankInterval);
    }
  }, [screen, player, playLeaderboardId]);

  // 4. Time Question Handler
  useEffect(() => {
    if (screen !== 'trivia' || questions.length === 0 || currentIdx >= questions.length) return;

    const currentQ = questions[currentIdx];
    
    // Clear any previous timer
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOpt(null);
    setFeedback(null);

    if (currentQ.time_limit_seconds && currentQ.time_limit_seconds > 0) {
      setTimeLeft(currentQ.time_limit_seconds);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Timeout -> Auto submit incorrect answer
            handleAnswerSubmit(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIdx, screen, questions]);

  // 4. Handle Registration Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playLeaderboardId) return;
    if (!playerName.trim()) {
      setErrorMsg('Por favor escribe tu nombre o apodo.');
      return;
    }
    setErrorMsg('');
    setRegistering(true);

    try {
      const newP = await registerPlayer(playerName, playLeaderboardId);
      setPlayer(newP);
      localStorage.setItem(`trivia_player_id_${playLeaderboardId}`, newP.id);
      localStorage.setItem(`trivia_player_name_${playLeaderboardId}`, newP.name);
      
      // Clear answers if starting fresh
      setPlayerAnswers([]);
      setTotalXP(0);
      setTotalCorrect(0);
      localStorage.removeItem(`trivia_answers_${newP.id}_${playLeaderboardId}`);

      if (questions.length === 0) {
        setScreen('trivia');
      } else {
        setScreen('trivia');
        setCurrentIdx(0);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un problema de conexión al registrarte.');
    } finally {
      setRegistering(false);
    }
  };

  // 5. Handle Trivia Answer Selection
  const handleAnswerSubmit = async (option: 'a' | 'b' | 'c' | 'd' | null) => {
    if (feedback || !player || !playLeaderboardId) return;
    
    if (timerRef.current) clearInterval(timerRef.current);

    setSubmittingAnswer(true);
    const currentQ = questions[currentIdx];
    
    const isCorrect = option !== null && option.toLowerCase() === currentQ.correct_option.toLowerCase();
    const xp = isCorrect ? currentQ.xp_value : 0;

    setSelectedOpt(option);
    setFeedback({ isCorrect, xpEarned: xp });

    // Store temporarily
    answersToSaveRef.current.push({
      id: crypto.randomUUID(),
      player_id: player.id,
      question_id: currentQ.id,
      selected_option: option || 'a',
      is_correct: isCorrect,
      xp_earned: xp,
      answered_at: new Date().toISOString(),
      leaderboard_id: playLeaderboardId
    });

    setTotalXP((prev) => prev + xp);
    if (isCorrect) setTotalCorrect((prev) => prev + 1);

    setTimeout(async () => {
      setFeedback(null);
      setSelectedOpt(null);
      setSubmittingAnswer(false);
      
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((prevIdx) => prevIdx + 1);
      } else {
        // Bulk save
        try {
          if (isDemoMode()) {
             // Simulate local saving
          } else {
             const { error } = await supabase!
              .from('answers')
              .insert(answersToSaveRef.current);
             if (error) throw error;
          }
           
          // Finalize results
          if (player) {
              await finalizePlayerResults(player.id, totalXP, totalCorrect, playLeaderboardId);
          }
          // Set to results screen
          setScreen('results');
          await loadRanking(player!.id);
        } catch (err) {
          console.error('Error final SAVING answers:', err);
             // Should show feedback to user here
        }
      }
    }, 1500);
  };

  // State: Reset locally to re-play
  const handleRestartLocal = () => {
    if (player && playLeaderboardId) {
      localStorage.removeItem(`trivia_answers_${player.id}_${playLeaderboardId}`);
    }
    if (playLeaderboardId) {
      localStorage.removeItem(`trivia_player_id_${playLeaderboardId}`);
      localStorage.removeItem(`trivia_player_name_${playLeaderboardId}`);
    }
    setPlayer(null);
    setPlayerAnswers([]);
    setTotalCorrect(0);
    setTotalXP(0);
    setCurrentIdx(0);
    setScreen('registration');
  };

  // Clear current selected trivia and return to general hub
  const handleExitLeaderboard = () => {
    localStorage.removeItem('play_selected_leaderboard_id');
    setPlayLeaderboardId(null);
    setPlayer(null);
    setQuestions([]);
    setCurrentIdx(0);
    setScreen('registration');
  };

  // Helper strings
  const getMotivationalMessage = (rank: number | null) => {
    if (!rank) return '¡Gran juego! Sigue entrenando para dominar las preguntas ⚡.';
    if (rank <= 3) return '¡Increíble! Estás en el podio de honor de este evento 🏆. ¡Sigue brillando!';
    if (rank <= 10) return '¡Excelente partida! Estás dentro del codiciado Top 10 general ⭐. ¡Increíble potencial!';
    return '¡Muchas gracias por participar en nuestra dinámica! Has dado un gran partido en el evento 🌟.';
  };

  // Layout Renders
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-brand-light">
        <RefreshCw className="w-12 h-12 text-brand-yellow animate-spin mb-4" />
        <span className="text-sm font-mono text-neutral-400">Cargando la trivia...</span>
      </div>
    );
  }

  // If no leaderboard has been selected for play yet, enforce selection first!
  if (!playLeaderboardId) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-between" id="view-play-select">
        {/* Simple Header */}
        <header className="border-b border-border-default bg-bg-subtle/80 backdrop-blur px-5 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center text-[#111211] font-display font-extrabold text-sm">
              T
            </div>
            <span className="font-display font-bold tracking-tight text-brand-yellow text-md">
              TRIVIA LIVE • SELECCIONAR
            </span>
          </div>
          <Link
            to="/"
            className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated border border-border-default rounded-full text-brand-light hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            ← Volver
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
          <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full blur-3xl" />
            
            <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow mb-5">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>

            <h2 className="text-xl font-display font-bold tracking-tight text-brand-light mb-1">
              Selecciona tu Trivia
            </h2>
            <p className="text-xs text-text-body mb-6">
              Elige uno de los eventos de trivia activos creados por el administrador para registrarte y competir en vivo.
            </p>

            {loadingBoards ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-brand-yellow animate-spin" />
                <span className="text-xs font-mono text-text-secondary">Cargando eventos...</span>
              </div>
            ) : leaderboardsList.length === 0 ? (
              <div className="text-center py-10 bg-bg-elevated/40 border border-dashed border-border-default rounded-2xl">
                <Database className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-xs text-brand-light font-bold mb-1">No hay trivias disponibles</p>
                <p className="text-[11px] text-text-secondary leading-relaxed px-4">
                  Por favor accede al panel de administración para crear tu primer Leaderboard y preguntas.
                </p>
                <button
                  onClick={loadLeaderboardsList}
                  className="mt-4 px-3 py-1.5 bg-bg-elevated border border-border-default text-xs font-bold font-mono text-brand-yellow rounded-xl hover:brightness-115 transition-all"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {leaderboardsList.map((board) => {
                  const isRegistration = board.status === 'registration';
                  const isResults = board.status === 'results';
                  return (
                    <button
                      key={board.id}
                      onClick={() => {
                        localStorage.setItem('play_selected_leaderboard_id', board.id);
                        setPlayLeaderboardId(board.id);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-bg-elevated border border-border-default/80 hover:border-brand-yellow flex items-center justify-between transition-all duration-200 cursor-pointer group active:scale-[0.99] hover:bg-bg-elevated/80"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-text-secondary/70 font-semibold block mb-0.5">
                          {new Date(board.created_at).toLocaleDateString()}
                        </span>
                        <h4 className="text-sm font-bold text-brand-light/95 truncate group-hover:text-brand-yellow transition-colors">
                          {board.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            isResults ? 'bg-red-400' : isRegistration ? 'bg-amber-400 animate-pulse' : 'bg-green-400 animate-pulse'
                          }`} />
                          <span className={`text-[10px] font-mono font-extrabold uppercase ${
                            isResults ? 'text-red-400' : isRegistration ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {isResults ? 'Finalizado' : isRegistration ? 'Borrador' : 'Activo'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-brand-yellow transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            
            <div className="mt-6 pt-5 border-t border-border-default flex justify-between items-center text-xs">
              <span className="text-text-secondary font-semibold font-mono">
                API: {isDemoMode() ? 'DEMO LOCAL' : 'SUPABASE BD'}
              </span>
              <Link to="/admin" className="text-brand-yellow font-extrabold hover:underline">
                Ir a Admin →
              </Link>
            </div>
          </div>
        </main>


      </div>
    );
  }

  const primaryColor = ensureHex(activeLeaderboard?.theme_primary, "#fed600");
  const secondaryColor = ensureHex(activeLeaderboard?.theme_secondary, "#111211");
  const cardBgStyle = activeLeaderboard?.theme_card_bg || "light";

  return (
    <div
      className="min-h-screen text-slate-800 p-4 flex flex-col justify-between relative"
      id="view-play"
      style={{
        backgroundImage: `linear-gradient(rgba(17, 18, 17, 0.72), rgba(17, 18, 17, 0.82)), url('${activeLeaderboard?.background_image_url || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?q=80&w=1600'}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <style>{`
        :root {
          --brand-primary: ${primaryColor};
          --brand-secondary: ${secondaryColor};
        }
        .text-brand-yellow {
          color: ${primaryColor} !important;
        }
        .bg-brand-yellow {
          background-color: ${primaryColor} !important;
        }
        .border-brand-yellow {
          border-color: ${primaryColor} !important;
        }
        .text-\[\#fed600\] {
          color: ${primaryColor} !important;
        }
        .bg-\[\#fed600\] {
          background-color: ${primaryColor} !important;
        }
        .border-\[\#fed600\] {
          border-color: ${primaryColor} !important;
        }
        .text-\[\#e5b300\] {
          color: ${primaryColor} !important;
          filter: brightness(1.2);
        }
        .bg-\[\#fed600\]\/10 {
          background-color: ${primaryColor}1a !important;
        }
        .border-\[\#fed600\]\/30 {
          border-color: ${primaryColor}4d !important;
        }
        .bg-\[\#111211\] {
          background-color: ${secondaryColor} !important;
        }
        .text-\[\#111211\] {
          color: ${secondaryColor} !important;
        }

        /* Specific card layout styling for dynamic gameplay overlay compatibility */
        #registration-card, #results-summary-card {
          background-color: transparent !important;
          color: #334155 !important;
          border: none !important;
          border-radius: 0px !important;
          box-shadow: none !important;
          padding: 0px !important;
        }

        #card_question_prompt {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: rgba(226, 232, 240, 0.8) !important;
        }

        /* Question prompt card specific text color adjustment */
        #registration-card h2, #registration-card p, #registration-card label,
        #card_question_prompt h3,
        #results-summary-card h2, #results-summary-card p, #results-summary-card h3 {
          color: #1e293b !important;
        }

        /* Dynamic answer option buttons */
        #block_answers_options button:not(.bg-emerald-50):not(.bg-red-50):not(.bg-brand-yellow\/10) {
          background-color: #ffffff !important;
          color: #334155 !important;
          border-color: rgba(226, 232, 240, 0.8) !important;
        }
        #block_answers_options button:not(.bg-emerald-50):not(.bg-red-50):not(.bg-brand-yellow\/10):hover {
          border-color: ${primaryColor} !important;
        }

        /* Player name input field adaptive theme styling */
        #input_player_name {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #e2e8f0 !important;
        }
        #input_player_name:focus {
          border-color: ${primaryColor} !important;
        }

        /* Ranking general list item style overrides */
        #ranking-rows-scroll > div:not(.bg-brand-yellow\/10) {
          background-color: #ffffff !important;
          color: #334155 !important;
          border-color: #f1f5f9 !important;
        }
        #ranking-rows-scroll > div span {
          color: #475569 !important;
        }
        #ranking-rows-scroll > div span.text-brand-yellow {
          color: ${primaryColor} !important;
        }
      `}</style>
      
      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {/* ENCLOSING GORGEOUS WHITE/FAFAFA CONTAINER CARD */}
        <div 
          className="bg-[#fafafa] text-slate-800 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/20 p-6 sm:p-8 relative overflow-hidden flex flex-col min-h-[460px] justify-between"
          id="play-container-card"
        >
          {/* Subtle inside gradient background light */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none" />

          {/* Active Player badge */}
          {player && screen !== 'registration' && (
            <div className="flex justify-between items-center mb-5 relative z-10 border-b border-slate-200/50 pb-3 shrink-0">
              <span className="text-[10px] font-mono text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                Jugador Activo
              </span>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm leading-none">
                <User className="w-3 h-3 text-brand-yellow shrink-0" style={{ color: primaryColor }} />
                <span>{player.name}</span>
              </div>
            </div>
          )}

          {console.log('PlayView: Rendering with screen', screen, 'and player', player)}
          <AnimatePresence mode="wait">
            
            {/* PANTALLA 1: REGISTRO */}
            {screen === 'registration' && (
              <motion.div
                key="register-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col relative"
                id="registration-card"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${primaryColor}1a`, borderColor: `${primaryColor}22`, borderWidth: "1px", color: primaryColor }}>
                  <Award className="w-6 h-6" />
                </div>

                <h2 className="text-2xl font-display font-black tracking-tight text-slate-900 mb-1.5">
                  ¿Listo para competir?
                </h2>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">
                  Ingresa tu nombre para unirte a la dinámica interactiva de este evento y acumular puntos de XP.
                </p>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Tu Nombre o Apodo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="input_player_name"
                        maxLength={30}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full bg-white border-2 border-slate-200 focus:border-brand-yellow focus:ring-0 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
                        required
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-700 font-medium bg-red-50 border border-red-250 px-3 py-2.5 rounded-xl">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide pulse-primary"
                    style={{ backgroundColor: primaryColor, color: secondaryColor }}
                    id="btn_start_trivia"
                  >
                    {registering ? 'Registrando...' : 'Iniciar Dinámica'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* PANTALLA 2: TRIVIA */}
            {screen === 'trivia' && (
              <motion.div
                key="trivia-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col gap-4 w-full"
                id="trivia-quiz"
              >
                {questions.length === 0 ? (
                  <div className="p-8 text-center" id="empty-questions-block">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 animate-bounce" style={{ color: primaryColor }} />
                    <h3 className="text-lg font-display font-bold text-slate-850 mb-2">Sin preguntas cargadas</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed font-semibold">
                      Aún no se han agregado preguntas al evento. Solicita al organizador cargarlas en la pantalla de administración para iniciar.
                    </p>
                    <button 
                      onClick={handleRestartLocal}
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer transition-all"
                    >
                      Regresar al menú
                    </button>
                  </div>
                ) : currentIdx >= questions.length ? (
                  <div className="p-8 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 animate-pulse" style={{ color: primaryColor }} />
                    <h3 className="text-lg font-display font-bold text-slate-850 mb-2">¡Completaste la Trivia!</h3>
                    <p className="text-xs text-slate-500 mb-6 font-semibold animate-pulse">
                      Procesando tus respuestas finales...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Status header & visual progress */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                        Pregunta <span className="font-black text-slate-700" style={{ color: primaryColor }}>{currentIdx + 1}</span> de {questions.length}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200/80 flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3 h-3" style={{ color: primaryColor }} />
                           +{questions[currentIdx].xp_value} XP
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200/80 flex items-center gap-1.5 shadow-sm">
                          {totalXP} XP
                        </span>
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden border border-slate-250/20">
                      <div 
                        className="h-full rounded-full transition-all duration-300" 
                        style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, backgroundColor: primaryColor }}
                      />
                    </div>

                    {/* Question Prompt Card */}
                    <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm relative overflow-hidden" id="card_question_prompt">
                      {/* Timer indicator */}
                      {questions[currentIdx].time_limit_seconds ? (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold font-mono">
                          <Clock className={`w-3.5 h-3.5 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : ''}`} style={{ color: timeLeft <= 3 ? '#ef4444' : primaryColor }} />
                          <span className={timeLeft <= 3 ? 'text-red-500 font-black' : 'text-slate-600'}>
                            {timeLeft}s
                          </span>
                        </div>
                      ) : null}

                      <div className="pt-4 pb-2">
                        <h3 className="text-sm sm:text-base font-display font-bold text-slate-800 leading-relaxed">
                          {questions[currentIdx].question}
                        </h3>
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="space-y-3" id="block_answers_options">
                      {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                        const optionText = questions[currentIdx][`option_${opt}` as keyof Question];
                        if (!optionText) return null;

                        // Styles determination
                        const isSelected = selectedOpt === opt;
                        const isCorrectAnswer = opt === questions[currentIdx].correct_option;
                        let btnStyle = 'border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-400 active:scale-[0.99]';
                        let iconEl = null;

                        if (feedback) {
                          if (isCorrectAnswer) {
                            btnStyle = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                            iconEl = <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
                          } else if (isSelected) {
                            btnStyle = 'border-2 border-red-500 bg-red-50 text-red-700 font-bold';
                            iconEl = <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
                          } else {
                            btnStyle = 'border border-slate-100 bg-slate-50 text-slate-400 opacity-40';
                          }
                        } else if (isSelected) {
                          btnStyle = 'border-2 font-bold';
                        }

                        return (
                          <button
                            key={opt}
                            onClick={() => handleAnswerSubmit(opt)}
                            disabled={feedback !== null || submittingAnswer}
                            className={`w-full p-4 rounded-2xl flex items-center gap-3 text-left text-sm font-semibold transition-all cursor-pointer ${btnStyle}`}
                            style={(!feedback && isSelected) ? { borderColor: primaryColor, backgroundColor: `${primaryColor}11`, color: secondaryColor } : undefined}
                            id={`btn_option_${opt}`}
                          >
                            {/* Option badge */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs uppercase shrink-0 transition-colors"
                                 style={
                                   feedback
                                     ? isCorrectAnswer
                                       ? { backgroundColor: '#10b981', color: 'white' }
                                       : isSelected
                                         ? { backgroundColor: '#ef4444', color: 'white' }
                                         : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                                     : isSelected
                                       ? { backgroundColor: primaryColor, color: secondaryColor }
                                       : { backgroundColor: '#f1f5f9', color: '#64748b' }
                                 }>
                              {opt}
                            </div>

                            <span className="flex-1 text-sm leading-tight pr-2">
                              {optionText}
                            </span>

                            {iconEl}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Banner Overlay */}
                    <AnimatePresence>
                      {feedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`p-4 rounded-2xl border text-center font-bold text-sm shadow-xl flex items-center justify-center gap-2 ${
                            feedback.isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-red-50 border-red-300 text-red-800'
                          }`}
                          id="feedback_box"
                        >
                          {feedback.isCorrect ? (
                            <>
                              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                              <span>¡Correcto! Ganaste <span className="text-emerald-700 font-extrabold font-mono text-base">+{feedback.xpEarned} XP</span></span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600 animate-bounce" />
                              <span>Incorrecto. ¡Sigue intentando! <span className="font-mono text-red-700">(0 XP)</span></span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            )}

            {/* PANTALLA 3: RESULTADOS PERSONALES CON TABLA DE RANKING COMPLETA */}
            {screen === 'results' && (
              <motion.div
                key="results-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-stretch text-left relative w-full"
                id="results-summary-card"
              >
                {/* Gold light burst decoration */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-5 border-b border-slate-200/50 pb-3 relative z-10 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 border border-brand-yellow/25 flex items-center justify-center text-brand-yellow shrink-0" style={{ backgroundColor: `${primaryColor}1a`, borderColor: `${primaryColor}25`, color: primaryColor }}>
                    <Trophy className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <h2 className="text-base font-display font-black tracking-tight text-slate-900">
                      ¡Trivia Completada!
                    </h2>
                    <p className="text-[11px] text-slate-400 font-bold">
                      {player ? `Gran partida, ${player.name}.` : 'Revisa tu lugar en el podio.'}
                    </p>
                  </div>
                </div>

                {/* Scorecard grids */}
                <div className="grid grid-cols-3 gap-2 mb-4 relative z-10 shrink-0">
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col items-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center leading-none">
                      XP GANADOS
                    </span>
                    <span className="text-sm font-mono font-black" style={{ color: primaryColor }}>
                      {totalXP.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col items-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center leading-none">
                      ACIERTOS
                    </span>
                    <span className="text-sm font-mono font-black text-emerald-500">
                      {totalCorrect} <span className="text-[10px] text-slate-400 font-bold font-sans">/ {questions.length}</span>
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col items-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center leading-none">
                      POSICIÓN
                    </span>
                    <span className="text-sm font-mono font-black animate-pulse" style={{ color: primaryColor }}>
                      {playerRank !== null ? `#${playerRank}` : '#--'}
                    </span>
                  </div>
                </div>

                {/* MOTIVATIONAL BANNER */}
                {playerRank !== null && (
                  <div className="bg-white border border-slate-200/60 rounded-2xl px-3 py-2.5 text-[11px] text-slate-650 leading-relaxed mb-4 text-center font-bold shadow-sm relative z-10 shrink-0">
                    {getMotivationalMessage(playerRank)}
                  </div>
                )}

                {/* Leaderboard associated with the complete ranking */}
                <div className="flex-1 flex flex-col min-h-[200px] max-h-[280px] overflow-hidden" id="ranking-container">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs font-display font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>Ranking General</span>
                    </h3>
                    {loadingRank && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold animate-pulse" style={{ color: primaryColor }}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Actualizando...
                      </span>
                    )}
                  </div>

                  <div className="overflow-y-auto space-y-2 flex-1 pr-1" id="ranking-rows-scroll">
                    {leaderboardRows.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm">
                        Cargando jugadores registrados...
                      </div>
                    ) : (
                      leaderboardRows.map((row) => {
                        const isCurrentPlayer = player && row.player_id === player.id;
                        return (
                          <div
                            key={row.player_id || row.id}
                            className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all border ${
                              isCurrentPlayer
                                ? 'bg-white font-black ring-2 shadow-sm'
                                : 'bg-white border-slate-200/60 hover:border-slate-300 text-slate-700 shadow-sm'
                            }`}
                            style={isCurrentPlayer ? { borderColor: primaryColor, ringColor: primaryColor } : undefined}
                            id={`ranking_row_${row.player_id}`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5.5 h-5.5 rounded-lg text-[9px] font-mono font-bold flex items-center justify-center shrink-0"
                                    style={
                                      row.rank === 1
                                        ? { backgroundColor: primaryColor, color: secondaryColor, fontWeight: '900' }
                                        : row.rank === 2
                                          ? { backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '900' }
                                          : row.rank === 3
                                            ? { backgroundColor: '#ffedd5', color: '#c2410c', fontWeight: '900' }
                                            : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderStyle: 'solid', borderWidth: '1px', color: '#64748b' }
                                    }>
                                #{row.rank}
                              </span>
                              <span className="truncate font-semibold text-xs text-slate-800">
                                {row.name} {isCurrentPlayer && <span className="text-[10px] font-bold font-mono" style={{ color: primaryColor }}>(Tú)</span>}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                              <span className="text-emerald-600 font-extrabold shrink-0" title="Respuestas correctas">
                                {row.correct_answers || 0} ✓
                              </span>
                              <span className="text-slate-200">•</span>
                              <span className="font-extrabold shrink-0 text-xs text-nowrap" style={{ color: primaryColor }}>
                                {(row.total_xp || 0).toLocaleString()} XP
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Actions footer wrapper wrapper */}
                <div className="grid grid-cols-1 gap-2 mt-5 pt-4 border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/leaderboard/${playLeaderboardId}`)}
                    className="py-3 font-bold rounded-xl text-xs cursor-pointer hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md text-white"
                    style={{ backgroundColor: primaryColor, color: secondaryColor }}
                    id="btn_view_leaderboard"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Ver Leaderboard
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
