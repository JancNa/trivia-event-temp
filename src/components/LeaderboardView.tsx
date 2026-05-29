/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { LeaderboardRow, LeaderboardInfo } from "../types";
import {
  fetchLeaderboard,
  subscribeToRealtimeAnswers,
  isDemoMode,
  insertMockCompetitor,
  fetchLeaderboardsSupabase,
  fetchActiveLeaderboardInfo,
} from "../dataService";
import {
  Trophy,
  Users,
  Zap,
  Crown,
  Search,
  RefreshCw,
  TrendingUp,
  Sparkles,
  HelpCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Gift,
  ChevronRight,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestActivity, setLatestActivity] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { leaderboardId } = useParams<{ leaderboardId: string }>();

  // Dynamic dynamic leaderboard selectors
  const [viewLeaderboardId, setViewLeaderboardId] = useState<string | null>(
    () => {
      if (leaderboardId) {
        localStorage.setItem("view_selected_leaderboard_id", leaderboardId);
        return leaderboardId;
      }
      return localStorage.getItem("view_selected_leaderboard_id");
    },
  );

  useEffect(() => {
    if (leaderboardId && leaderboardId !== viewLeaderboardId) {
      setViewLeaderboardId(leaderboardId);
      localStorage.setItem("view_selected_leaderboard_id", leaderboardId);
    }
  }, [leaderboardId]);

  const [leaderboardsList, setLeaderboardsList] = useState<LeaderboardInfo[]>(
    [],
  );
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] =
    useState<LeaderboardInfo | null>(null);

  // 1. Initial Load and Subscription Setup
  const loadData = async (
    showRefreshIndicator = false,
    boardId = viewLeaderboardId,
  ) => {
    if (!boardId) return;
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const rows = await fetchLeaderboard(boardId);
      setLeaderboard(rows);
    } catch (err) {
      console.error("Error in leaderboard fetching:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadBoards = async () => {
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

  useEffect(() => {
    loadBoards();
  }, [viewLeaderboardId]);

  useEffect(() => {
    if (!viewLeaderboardId) {
      setLoading(false);
      return;
    }

    setLeaderboard([]);
    loadData(false, viewLeaderboardId);

    async function loadBoardInfo() {
      try {
        const info = await fetchActiveLeaderboardInfo(viewLeaderboardId);
        setActiveLeaderboard(info);
      } catch (err) {
        console.error(err);
      }
    }
    loadBoardInfo();

    // Subscribe to changes in temp.answers (Postgres Changes INSERT)
    const unsubscribe = subscribeToRealtimeAnswers(() => {
      setLatestActivity("¡Nueva respuesta registrada! Actualizando ranking...");
      loadData(false, viewLeaderboardId);

      const t = setTimeout(() => setLatestActivity(""), 3000);
      return () => clearTimeout(t);
    });

    return () => {
      unsubscribe();
    };
  }, [viewLeaderboardId]);

  // 2. Compute visual aggregate metrics directly from list rows to keep queries perfectly in sync
  const metrics = useMemo(() => {
    const totalPlayers = leaderboard.length;
    const totalXP = leaderboard.reduce(
      (sum, item) => sum + Number(item.total_xp),
      0,
    );
    return {
      totalPlayers,
      totalXP,
    };
  }, [leaderboard]);

  // 3. Extract top 3 for podium
  const podium = useMemo(() => {
    const first = leaderboard.find((r) => r.rank === 1) || null;
    const second = leaderboard.find((r) => r.rank === 2) || null;
    const third = leaderboard.find((r) => r.rank === 3) || null;
    return { first, second, third };
  }, [leaderboard]);

  // Max score for relative progress bar widths
  const maxScore = useMemo(() => {
    if (leaderboard.length === 0) return 1;
    return Math.max(...leaderboard.map((r) => Number(r.total_xp)), 1);
  }, [leaderboard]);

  // 4. Filtering for search query
  const filteredLeaderboard = useMemo(() => {
    if (!searchTerm.trim()) return leaderboard;
    return leaderboard.filter((r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [leaderboard, searchTerm]);

  // Trigger simulated player submission to show UI action dynamically
  const spawnFakePlayer = async () => {
    if (!viewLeaderboardId) return;
    if (!isDemoMode()) {
      alert(
        'Activa el "Modo Demo" en el botón de configuración de arriba para poder simular competidores sin conexión.',
      );
      return;
    }
    const names = [
      "Catalina Gómez",
      "Mateo Rivera",
      "Paula Torres",
      "Lucas Silva",
      "Valentina Vega",
      "Andrés Martínez",
      "Alejandra Muñoz",
      "Felipe Ortiz",
    ];
    const pickedName =
      names[Math.floor(Math.random() * names.length)] +
      ` (Sim # ${Math.floor(Math.random() * 100)})`;
    await insertMockCompetitor(
      pickedName,
      Math.random() * 0.4 + 0.6,
      viewLeaderboardId,
    );
    await loadData(false, viewLeaderboardId);
  };

  const [showPrizes, setShowPrizes] = useState(false);

  // If no leaderboard has been selected for spectating yet, enforce selection first!
  if (!viewLeaderboardId) {
    return (
      <div
        className="min-h-screen text-slate-800 p-4 md:p-8 flex flex-col justify-between select-none relative"
        id="view-leaderboard-select"
        style={{
          backgroundImage:
            `linear-gradient(rgba(17, 18, 17, 0.72), rgba(17, 18, 17, 0.82)), url('${activeLeaderboard?.background_image_url || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?q=80&w=1600'}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Floating navbar */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
          <Link
            to="/"
            className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-brand-yellow font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 backdrop-blur shadow-lg pointer-events-auto cursor-pointer"
          >
            <span>← Volver al Portal</span>
          </Link>
        </div>

        {/* Content Card */}
        <div className="max-w-md w-full mx-auto mt-20 mb-12 relative z-10">
          <div className="bg-white/98 text-slate-800 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/20 overflow-hidden p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-[#fed600]/10 border border-[#fed600]/25 flex items-center justify-center text-[#fed600] mb-5">
              <Trophy className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-display font-black text-[#111211] tracking-tight mb-1">
              Monitorear Trivia
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              Selecciona uno de los rankings o competiciones activas para
              desplegar la transmisión en tiempo real para todos los
              espectadores.
            </p>

            {loadingBoards ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-[#fed600] animate-spin" />
                <span className="text-xs font-mono text-slate-400">
                  Cargando eventos...
                </span>
              </div>
            ) : leaderboardsList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-bold mb-1">
                  No hay trivias todavía
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed px-4">
                  Por favor ve al panel de administración para crear tu tabla de
                  posiciones.
                </p>
                <button
                  onClick={loadBoards}
                  className="mt-4 px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-bold font-mono text-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {leaderboardsList.map((board) => {
                  const isRegistration = board.status === "registration";
                  const isResults = board.status === "results";
                  return (
                    <button
                      key={board.id}
                      onClick={() => {
                        localStorage.setItem(
                          "view_selected_leaderboard_id",
                          board.id,
                        );
                        setViewLeaderboardId(board.id);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-between transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold block mb-0.5">
                          {new Date(board.created_at).toLocaleDateString()}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-[#fed600] transition-colors">
                          {board.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              isResults
                                ? "bg-red-400"
                                : isRegistration
                                  ? "bg-amber-400 animate-pulse"
                                  : "bg-green-400 animate-pulse"
                            }`}
                          />
                          <span
                            className={`text-[10px] font-mono font-extrabold uppercase ${
                              isResults
                                ? "text-red-400"
                                : isRegistration
                                  ? "text-amber-400"
                                  : "text-green-500"
                            }`}
                          >
                            {isResults
                              ? "Finalizado"
                              : isRegistration
                                ? "Borrador"
                                : "Activo"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#fed600] transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold font-mono text-[10px]">
                API: {isDemoMode() ? "DEMO LOCAL" : "SUPABASE BD"}
              </span>
              <Link
                to="/admin"
                className="text-[#111211] font-black hover:underline select-none"
              >
                Ir a Admin →
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-[10px] text-white/35 font-semibold uppercase tracking-widest leading-none select-none py-4 border-t border-white/5">
          Dinámica de Trivia Realtime • Panel de Difusión Central • Corporativo
          Leal 360
        </footer>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-slate-800 p-4 md:p-8 flex flex-col justify-between select-none relative"
      id="view-leaderboard"
      style={{
        backgroundImage:
          `linear-gradient(rgba(17, 18, 17, 0.72), rgba(17, 18, 17, 0.82)), url('${activeLeaderboard?.background_image_url || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?q=80&w=1600'}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Floating Quiet Control Utilities Bar at the very top */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            to="/"
            className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-brand-yellow font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 backdrop-blur shadow-lg cursor-pointer"
            id="btn_leaderboard_home"
          >
            <span>← Portal</span>
          </Link>
          <button 
            onClick={() => {
              localStorage.removeItem('view_selected_leaderboard_id');
              setViewLeaderboardId(null);
              setLeaderboard([]);
            }}
            className="px-3 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-brand-yellow font-bold rounded-xl text-xs transition-colors backdrop-blur shadow-lg cursor-pointer flex items-center gap-1.5"
          >
            Cambiar Evento 🏆
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isDemoMode() && (
            <button
              onClick={spawnFakePlayer}
              className="px-3 py-2 bg-[#fed600] text-[#111211] hover:brightness-110 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
              id="btn-trigger-mock-competitor"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Simular</span>
            </button>
          )}

          <button
            onClick={() => loadData(true, viewLeaderboardId)}
            className="p-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-white hover:text-brand-yellow transition-all cursor-pointer backdrop-blur shadow-lg"
            title="Refrescar ranking manualmente"
            id="btn-manual-refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#fed600]" : ""}`}
            />
          </button>


        </div>
      </div>

      {/* MAIN CENTERED LEADERBOARD CONTAINER CARD */}
      <div className="max-w-4xl w-full mx-auto mt-12 mb-12 relative z-10 transition-all duration-300">
        {/* LEAL FLOATING LOGO */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 select-none transition-transform duration-300 hover:scale-105">
            {activeLeaderboard?.prize_sponsor || activeLeaderboard?.logo_url ? (
              <img
                src={activeLeaderboard.prize_sponsor || activeLeaderboard.logo_url}
                alt="Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
              />
            ) : (
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
              >
                {/* Pointy speech tail at 10 o'clock position */}
                <path
                  d="M 50,14 A 36,36 0 1,1 22,28 L 5,14 L 28,22 A 36,36 0 0,1 50,14 Z"
                  fill="#fed600"
                  stroke="#fed600"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <text
                  x="51"
                  y="56"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Inter', 'Outfit', system-ui, sans-serif"
                  fill="#111211"
                  letterSpacing="-0.5"
                  textAnchor="middle"
                >
                  leal
                </text>
                {/* Smile arc and eyes elements for premium look */}
                <path
                  d="M 39,63 A 12,12 0 0,0 63,63"
                  fill="none"
                  stroke="#111211"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* CORE WHITE CARD */}
        <div
          className="bg-white/98 text-slate-800 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/20 overflow-hidden relative"
          id="leaderboard_primary_board"
        >
          {/* STATS DIVISIONS */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-[#fafafa] border-b border-slate-100 pt-20 pb-6 px-4 text-center">
            <div className="flex flex-col justify-center items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                Pactipantes
              </span>
              <span
                className="text-2xl sm:text-3.5xl font-black text-[#111211] tracking-tight mt-1"
                id="metric-participants"
              >
                {metrics.totalPlayers.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col justify-center items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                XP Total
              </span>
              <span
                className="text-2xl sm:text-3.5xl font-black text-[#111211] tracking-tight mt-1"
                id="metric-total-xp"
              >
                {metrics.totalXP.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col justify-center items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                Ganadores
              </span>
              <span className="text-2xl sm:text-3.5xl font-black text-[#111211] tracking-tight mt-1">
                TOP 1
              </span>
            </div>
          </div>

          {/* ACCORDION TRIGGER FOR AVAILABLE PRIZES */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => setShowPrizes(!showPrizes)}
              className="w-full py-4 px-6 flex items-center justify-center gap-2 hover:bg-slate-50/60 active:bg-slate-100 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 transition-all cursor-pointer"
              id="btn_view_prizes_accordion"
            >
              <Gift className="w-4 h-4 text-[#fed600] shrink-0" />
              <span>Premios del Evento</span>
              {showPrizes ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {showPrizes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[#fafafb]/85"
                >
                  <div className="p-6 border-t border-slate-100 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                      {/* 1st Place */}
                      <div className="p-3.5 bg-yellow-50/60 border border-yellow-100 rounded-2xl flex gap-3.5 items-center">
                        <div className="text-2xl shrink-0">👑</div>
                        <div>
                          <div className="font-bold text-[#111211]">
                            1er Lugar: {activeLeaderboard?.prize_title || "Premios del Evento"}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {activeLeaderboard?.prize_description || "Premios especiales para el ganador."}
                          </p>
                        </div>
                      </div>

                      {/* 2nd Place */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex gap-3.5 items-center">
                        <div className="text-2xl shrink-0">🥈</div>
                        <div>
                          <div className="font-bold text-[#111211]">
                            2do Lugar
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Reconocimiento destacado
                          </p>
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-3.5 items-center">
                        <div className="text-2xl shrink-0">🥉</div>
                        <div>
                          <div className="font-bold text-[#111211]">
                            3er Lugar
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Reconocimiento destacado
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* REALTIME TOAST CONTAINER */}
            <AnimatePresence>
              {latestActivity && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-center rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                  id="realtime-activity-toast"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{latestActivity}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DYNAMIC CORPORATE COLOR PODIUM */}
            <div
                className="pt-6 relative max-w-2xl mx-auto flex justify-center items-end gap-3 sm:gap-6 min-h-[290px]"
                id="podium_wrap"
              >
                {/* #2 PODIUM COLUMN BAR (BLACK/CHARCOAL) */}
                <div className="w-24 sm:w-32 flex flex-col items-center">
                  {podium.second ? (
                    <motion.div
                      className="text-center w-full flex flex-col items-center"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      id="podium-row-place-2"
                    >
                      <div className="w-11 h-11 bg-slate-100 border-2 border-slate-300 rounded-full flex items-center justify-center text-lg shadow-sm relative z-20">
                        🥈
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#111211] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          2
                        </span>
                      </div>
                      <div className="mt-2 font-display text-xs sm:text-sm font-black text-slate-800 truncate max-w-[90px] uppercase">
                        {podium.second.player_name || ""}
                      </div>
                      <div className="text-xs font-black text-slate-500 font-mono mt-0.5">
                        {Number(podium.second.total_xp).toLocaleString()}{" "}
                        <span className="text-[10px] opacity-70">XP</span>
                      </div>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold mb-2">
                      #2 0 XP
                    </span>
                  )}
                  {/* Visual Solid Block in Charcoal Black */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: podium.second ? 95 : 0 }}
                    className="w-full bg-[#111211] rounded-t-2xl shadow-md mt-4 relative overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10" />
                  </motion.div>
                </div>

                {/* #1 PODIUM COLUMN BAR (PURE CORAL RED) */}
                <div className="w-28 sm:w-36 flex flex-col items-center">
                  {podium.first ? (
                    <motion.div
                      className="text-center w-full flex flex-col items-center"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      id="podium-row-place-1"
                    >
                      {/* Top crown badge */}
                      <div className="w-14 h-14 bg-yellow-100 border-2 border-[#fed600] rounded-full flex items-center justify-center text-2xl shadow-md relative z-20">
                        👑
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#fed600] text-[#111211] text-xs font-black rounded-full flex items-center justify-center ring-2 ring-white">
                          1
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] font-black text-[#fed600] uppercase tracking-widest bg-[#111211] px-2 py-0.5 rounded-full select-none">
                        Ganador
                      </div>
                      <div className="mt-1.5 font-display text-sm sm:text-base font-black text-[#111211] truncate max-w-[110px] uppercase tracking-wide">
                        {podium.first.player_name || ""}
                      </div>
                      <div className="text-sm font-black text-[#fed600] drop-shadow-sm font-mono mt-0.5">
                        {Number(podium.first.total_xp).toLocaleString()}{" "}
                        <span className="text-[11px] font-bold">XP</span>
                      </div>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold mb-2">
                      #1 0 XP
                    </span>
                  )}
                  {/* Visual Solid Block in Yellow */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: podium.first ? 135 : 0 }}
                    className="w-full bg-[#fed600] rounded-t-2xl shadow-[0_4px_25px_rgba(254,214,0,0.35)] mt-4 relative overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-2 bg-white/40" />
                  </motion.div>
                </div>

                {/* #3 PODIUM COLUMN BAR (MEDIUM SLATE GREY) */}
                <div className="w-24 sm:w-32 flex flex-col items-center">
                  {podium.third ? (
                    <motion.div
                      className="text-center w-full flex flex-col items-center"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      id="podium-row-place-3"
                    >
                      <div className="w-11 h-11 bg-slate-100 border-2 border-slate-300 rounded-full flex items-center justify-center text-lg shadow-sm relative z-20">
                        🥉
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          3
                        </span>
                      </div>
                      <div className="mt-2 font-display text-xs sm:text-sm font-black text-slate-800 truncate max-w-[90px] uppercase">
                        {podium.third.player_name || ""}
                      </div>
                      <div className="text-xs font-black text-slate-500 font-mono mt-0.5">
                        {Number(podium.third.total_xp).toLocaleString()}{" "}
                        <span className="text-[10px] opacity-70">XP</span>
                      </div>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold mb-2">
                      #3 0 XP
                    </span>
                  )}
                  {/* Visual Solid Block in Slate Grey */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: podium.third ? 65 : 0 }}
                    className="w-full bg-[#4a4b4a] rounded-t-2xl shadow-md mt-4 relative overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/10" />
                  </motion.div>
                </div>
              </div>

            {/* TABLE LISTING */}
            <div
              className="bg-[#fcfbfb]/50 border border-slate-100 rounded-3xl overflow-hidden mt-6"
              id="leaderboard-full-ranking"
            >
              <div className="divide-y divide-slate-100">
                {filteredLeaderboard.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    Ningún participante coincide con esa búsqueda.
                  </div>
                ) : (
                  filteredLeaderboard.map((row) => {
                    const isRank1 = row.rank === 1;
                    const isRank2 = row.rank === 2;
                    const isRank3 = row.rank === 3;
                    const isTop3 = row.rank <= 3;

                    let medalBadge = null;
                    let numBadgeClass = "text-slate-400";
                    let bgCircle = "bg-slate-100";

                    if (isRank1) {
                      bgCircle = "bg-[#fed600] text-[#111211]";
                      numBadgeClass = "text-[#111211] font-black";
                    } else if (isRank2) {
                      bgCircle = "bg-[#111211] text-white";
                      numBadgeClass = "text-white font-black";
                    } else if (isRank3) {
                      bgCircle = "bg-[#4a4b4a] text-white";
                      numBadgeClass = "text-white font-black";
                    } else {
                      numBadgeClass = "text-slate-500 font-bold";
                      bgCircle = "bg-transparent";
                    }

                    // Progress width proportional to maxScore
                    const progressPercent = Math.min(
                      100,
                      Math.max(10, (Number(row.total_xp) / maxScore) * 100),
                    );

                    console.log('Row data:', row);

                    return (
                      <motion.div
                        key={row.player_id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50 border-l-4 border-transparent hover:border-[#fed600] transition-colors"
                        layoutId={`player-row-${row.player_id}`}
                      >
                          {/* LEFT: Rank Num avatar circle & Competitor Name */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgCircle} text-xs font-mono shadow-sm`}
                          >
                            <span className={numBadgeClass}>{row.rank}</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#111211] text-xs sm:text-[13px] uppercase tracking-wide truncate">
                              {row.player_name}
                            </div>
                          </div>

                          {/* MIDDLE PROPORTIONAL PROGRESS BAR */}
                          <div className="hidden md:block w-48 xl:w-64 bg-slate-100 h-2.5 rounded-full overflow-hidden shrink-0 relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full transition-all ${
                                isTop3 ? "bg-[#fed600]" : "bg-[#fed600]/80"
                              }`}
                            />
                          </div>
                          
                          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                            <span>{row.correct_answers || 0} ✓</span>
                            <span>{row.total_answers || 0} total</span>
                          </div>
                        </div>

                        {/* RIGHT SCORE & AWARD BADGE */}
                        <div className="flex items-center gap-4 shrink-0 justify-end">
                          <div className="text-right whitespace-nowrap">
                            <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                              {Number(row.total_xp).toLocaleString()}
                            </span>
                            <span className="font-mono text-[9px] font-black uppercase text-slate-400 ml-1">
                              XP
                            </span>
                          </div>

                          {/* OUTLINE TROPHY BADGE (Only for #1) */}
                          {row.rank === 1 && (
                            <div className="px-2.5 py-1.5 bg-[#fed600]/10 border border-[#fed600]/30 text-[#e5b300] text-[10px] font-extrabold uppercase rounded-lg tracking-widest flex items-center gap-1 shadow-sm select-none">
                              <Trophy className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Ganador</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Footer timestamp feedback */}
        <div className="mt-4 text-center">
          <p className="text-[10px] sm:text-xs font-extrabold text-white/50 tracking-wide">
            Actualizado en tiempo real •{" "}
            {new Date().toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <footer className="mt-8 text-center text-[10px] text-white/35 font-semibold uppercase tracking-widest leading-none select-none py-4 border-t border-white/5">
        Dinámica de Trivia Realtime • Panel de Difusión Central • Corporativo
        Leal 360
      </footer>
    </div>
  );
}
