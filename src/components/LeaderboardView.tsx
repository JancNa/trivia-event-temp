/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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

export default function LeaderboardView() {
  const navigate = useNavigate();
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
      // Direct access to /leaderboard should always demand a new selection first
      return null;
    },
  );

  useEffect(() => {
    if (leaderboardId) {
      if (leaderboardId !== viewLeaderboardId) {
        setViewLeaderboardId(leaderboardId);
        localStorage.setItem("view_selected_leaderboard_id", leaderboardId);
      }
    } else {
      // Direct access to /leaderboard should always demand a new selection first
      setViewLeaderboardId(null);
    }
  }, [leaderboardId]);

  const [leaderboardsList, setLeaderboardsList] = useState<LeaderboardInfo[]>(
    [],
  );
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] =
    useState<LeaderboardInfo | null>(null);
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);

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

    // Fetch leaderboard periodically every 2 seconds
    const intervalId = setInterval(() => {
      loadData(false, viewLeaderboardId);
    }, 2000);

    // Subscribe to changes in temp.answers (Postgres Changes INSERT)
    const unsubscribe = subscribeToRealtimeAnswers(() => {
      setLatestActivity("¡Nueva respuesta registrada! Actualizando ranking...");
      loadData(false, viewLeaderboardId);

      const t = setTimeout(() => setLatestActivity(""), 3000);
      return () => clearTimeout(t);
    });

    return () => {
      unsubscribe();
      clearInterval(intervalId);
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
                  const boardPrimary = ensureHex(board.theme_primary, "#fed600");
                  const boardSecondary = ensureHex(board.theme_secondary, "#111211");
                  const isHovered = hoveredBoardId === board.id;

                  return (
                    <button
                      key={board.id}
                      onClick={() => {
                        localStorage.setItem(
                          "view_selected_leaderboard_id",
                          board.id,
                        );
                        setViewLeaderboardId(board.id);
                        navigate(`/leaderboard/${board.id}`);
                      }}
                      onMouseEnter={() => setHoveredBoardId(board.id)}
                      onMouseLeave={() => setHoveredBoardId(null)}
                      className="w-full text-left p-4 rounded-2xl bg-slate-50 border flex items-center justify-between transition-all duration-250 cursor-pointer active:scale-[0.99]"
                      style={{
                        borderColor: isHovered ? boardPrimary : "rgba(226, 232, 240, 0.6)",
                        backgroundColor: isHovered ? `${boardPrimary}0b` : "rgba(248, 250, 252, 0.8)",
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold block mb-0.5">
                          {new Date(board.created_at).toLocaleDateString()}
                        </span>
                        <h4 
                          className="text-xs sm:text-sm font-bold truncate transition-colors duration-250 font-display"
                          style={{
                            color: isHovered ? boardPrimary : "#1e293b",
                          }}
                        >
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
                      <ChevronRight 
                        className="w-4 h-4 transition-colors shrink-0" 
                        style={{
                          color: isHovered ? boardPrimary : "#94a3b8",
                        }}
                      />
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

  const primaryColor = ensureHex(activeLeaderboard?.theme_primary, "#fed600");
  const secondaryColor = ensureHex(activeLeaderboard?.theme_secondary, "#111211");
  const cardBgStyle = activeLeaderboard?.theme_card_bg || "light";

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
      <style>{`
        :root {
          --brand-primary: ${primaryColor};
          --brand-secondary: ${secondaryColor};
        }
        
        /* Specific element dynamic customizations with supreme specificity */
        #leaderboard_primary_board .text-brand-yellow,
        #leaderboard-full-ranking .text-brand-yellow,
        .text-brand-yellow {
          color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .bg-brand-yellow,
        #leaderboard-full-ranking .bg-brand-yellow,
        .bg-brand-yellow {
          background-color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .border-brand-yellow,
        #leaderboard-full-ranking .border-brand-yellow,
        .border-brand-yellow {
          border-color: ${primaryColor} !important;
        }
        
        #leaderboard_primary_board .text-\[\#fed600\],
        #leaderboard-full-ranking .text-\[\#fed600\],
        .text-\[\#fed600\] {
          color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .bg-\[\#fed600\],
        #leaderboard-full-ranking .bg-\[\#fed600\],
        .bg-\[\#fed600\] {
          background-color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .border-\[\#fed600\],
        #leaderboard-full-ranking .border-\[\#fed600\],
        .border-\[\#fed600\] {
          border-color: ${primaryColor} !important;
        }
        
        #leaderboard_primary_board .hover\:text-\[\#fed600\]:hover,
        #leaderboard-full-ranking .hover\:text-\[\#fed600\]:hover,
        .hover\:text-\[\#fed600\]:hover {
          color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .group-hover\:text-\[\#fed600\],
        #leaderboard-full-ranking .group-hover\:text-\[\#fed600\],
        .group-hover\:text-\[\#fed600\] {
          color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .group:hover .group-hover\:text-\[\#fed600\],
        #leaderboard_primary_board .group:hover .group-hover\:border-\[\#fed600\],
        .group:hover .group-hover\:text-\[\#fed600\],
        .group:hover .group-hover\:border-\[\#fed600\] {
          color: ${primaryColor} !important;
          border-color: ${primaryColor} !important;
        }
        
        #leaderboard_primary_board .bg-\[\#111211\],
        #leaderboard-full-ranking .bg-\[\#111211\],
        .bg-\[\#111211\] {
          background-color: ${secondaryColor} !important;
        }
        #leaderboard_primary_board .text-\[\#111211\],
        #leaderboard-full-ranking .text-\[\#111211\],
        .text-\[\#111211\] {
          color: ${secondaryColor} !important;
        }
        
        #leaderboard_primary_board .text-\[\#e5b300\],
        #leaderboard-full-ranking .text-\[\#e5b300\],
        .text-\[\#e5b300\] {
          color: ${primaryColor} !important;
          filter: brightness(1.2);
        }
        
        #leaderboard_primary_board .bg-\[\#fed600\]\/10,
        #leaderboard-full-ranking .bg-\[\#fed600\]\/10,
        .bg-\[\#fed600\]\/10 {
          background-color: ${primaryColor}1a !important;
        }
        #leaderboard_primary_board .bg-\[\#fed600\]\/80,
        #leaderboard-full-ranking .bg-\[\#fed600\]\/80,
        .bg-\[\#fed600\]\/80 {
          background-color: ${primaryColor}cc !important;
        }
        #leaderboard_primary_board .bg-\[\#fed600\]\/25,
        #leaderboard-full-ranking .bg-\[\#fed600\]\/25,
        .bg-\[\#fed600\]\/25 {
          background-color: ${primaryColor}40 !important;
        }
        #leaderboard_primary_board .border-\[\#fed600\]\/30,
        #leaderboard-full-ranking .border-\[\#fed600\]\/30,
        .border-\[\#fed600\]\/30 {
          border-color: ${primaryColor}4d !important;
        }
        #leaderboard_primary_board .border-\[\#fed600\]\/25,
        #leaderboard-full-ranking .border-\[\#fed600\]\/25,
        .border-\[\#fed600\]\/25 {
          border-color: ${primaryColor}40 !important;
        }
        #leaderboard_primary_board .hover\:border-\[\#fed600\]:hover,
        #leaderboard-full-ranking .hover\:border-\[\#fed600\]:hover,
        .hover\:border-\[\#fed600\]:hover {
          border-color: ${primaryColor} !important;
        }
        #leaderboard_primary_board .border-l-\[\#fed600\],
        #leaderboard-full-ranking .border-l-\[\#fed600\],
        .border-l-\[\#fed600\] {
          border-left-color: ${primaryColor} !important;
        }
        
        /* Override primary board bg container */
        #leaderboard_primary_board {
          background-color: #fafafa !important;
          color: #111211 !important;
          border-color: rgba(226, 232, 240, 0.8) !important;
          backdrop-filter: none !important;
        }
        
        /* Stats divisions block bg */
        #leaderboard_primary_board .bg-\[\#fafafa\] {
          background-color: #f5f5f5 !important;
          border-color: #e2e8f0 !important;
        }
        
        #leaderboard_primary_board .divide-slate-100 > * + * {
          border-color: #e2e8f0 !important;
        }
        
        /* Accordion items */
        .overflow-hidden.bg-\[\#fafafb\]\/85 {
          background-color: #fafafa !important;
        }
        
        /* Table rows and borders style */
        #leaderboard-full-ranking {
          background-color: #fafafa !important;
          border-color: #e2e8f0 !important;
        }
        
        #leaderboard-full-ranking .divide-slate-100 > * + * {
          border-color: #e2e8f0 !important;
        }
        
        #leaderboard-full-ranking .bg-white {
          background-color: #ffffff !important;
          color: #111211 !important;
        }
        
        #leaderboard-full-ranking .bg-white:hover {
          background-color: #f1f5f9 !important;
        }
        
        #leaderboard-full-ranking .hover\:border-\[\#fed600\]:hover {
          border-left-color: ${primaryColor} !important;
        }
        
        /* General texts under #leaderboard_primary_board should be charcoal #111211 */
        #leaderboard_primary_board h2,
        #leaderboard_primary_board h3,
        #leaderboard_primary_board h4,
        #leaderboard_primary_board p,
        #leaderboard_primary_board td,
        #leaderboard_primary_board th,
        #leaderboard_primary_board button {
          color: #111211 !important;
        }
        
        #leaderboard_primary_board span:not(.text-brand-yellow):not(.text-\\[\\#fed600\\]):not(.text-\\[\\#e5b300\\]):not(.rank-number) {
          color: #111211 !important;
        }
        
        #leaderboard_primary_board .text-[#111211],
        #leaderboard_primary_board .text-slate-800,
        #leaderboard_primary_board .text-slate-700,
        #leaderboard_primary_board .text-slate-600,
        #leaderboard_primary_board .text-slate-500,
        #leaderboard_primary_board .text-slate-400 {
          color: #111211 !important;
        }
      `}</style>

      {/* Floating Quiet Control Utilities Bar at the very top */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            to="/"
            className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-brand-yellow font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 backdrop-blur shadow-lg cursor-pointer"
          >
            <span>← Volver al Portal</span>
          </Link>
          <button
            onClick={() => {
              setViewLeaderboardId(null);
              navigate("/leaderboard");
            }}
            className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-white hover:text-brand-yellow font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 backdrop-blur shadow-lg cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>📊 Cambiar Trivia</span>
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
                  fill={primaryColor}
                  stroke={primaryColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <text
                  x="51"
                  y="56"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Inter', 'Outfit', system-ui, sans-serif"
                  fill={secondaryColor}
                  letterSpacing="-0.5"
                  textAnchor="middle"
                >
                  leal
                </text>
                {/* Smile arc and eyes elements for premium look */}
                <path
                  d="M 39,63 A 12,12 0 0,0 63,63"
                  fill="none"
                  stroke={secondaryColor}
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
                Participantes
              </span>
              <span
                className="text-2xl sm:text-3.5xl font-black tracking-tight mt-1"
                id="metric-participants"
                style={{ color: secondaryColor }}
              >
                {metrics.totalPlayers.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col justify-center items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                XP Total
              </span>
              <span
                className="text-2xl sm:text-3.5xl font-black tracking-tight mt-1"
                id="metric-total-xp"
                style={{ color: secondaryColor }}
              >
                {metrics.totalXP.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col justify-center items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                Ganadores
              </span>
              <span 
                className="text-2xl sm:text-3.5xl font-black tracking-tight mt-1"
                style={{ color: secondaryColor }}
              >
                TOP {activeLeaderboard?.prize_top_n || 1}
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
              <Gift className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
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
                      <div className="p-3.5 bg-yellow-50/60 border border-yellow-100 rounded-2xl flex flex-col gap-3 items-start justify-between min-h-[110px]">
                        <div className="flex gap-3.5 items-center">
                          <div className="text-2xl shrink-0">👑</div>
                          <div className="flex-1">
                            <div className="font-bold text-[#111211]">
                              1er Lugar: {activeLeaderboard?.prize_title || "Premios del Evento"}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {activeLeaderboard?.prize_description || "Premios especiales para el ganador."}
                            </p>
                          </div>
                        </div>

                        {/* Dynamic Prize Sponsor & Prize Image */}
                        {(activeLeaderboard?.prize_image_url || activeLeaderboard?.prize_sponsor) && (
                          <div className="w-full flex items-center justify-between pt-2 border-t border-yellow-200/30 gap-2 mt-1">
                            {activeLeaderboard.prize_image_url ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Premio:</span>
                                <img 
                                  src={activeLeaderboard.prize_image_url} 
                                  alt="Premio" 
                                  className="h-8 w-8 object-cover rounded-md border border-yellow-200" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : <div />}

                            {activeLeaderboard.prize_sponsor && (
                              <div className="flex items-center gap-1.5 font-sans">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Sponsor:</span>
                                {activeLeaderboard.prize_sponsor.startsWith("http") ? (
                                  <img 
                                    src={activeLeaderboard.prize_sponsor} 
                                    alt="Sponsor" 
                                    className="h-6 object-contain max-w-[80px]" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[10px] font-black text-slate-700">{activeLeaderboard.prize_sponsor}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2nd Place */}
                      <div className={`p-3.5 border rounded-2xl flex gap-3.5 items-center ${activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 2 ? 'bg-amber-50/40 border-yellow-200' : 'bg-slate-50 border-slate-200/60'}`}>
                        <div className="text-2xl shrink-0">🥈</div>
                        <div>
                          <div className="font-bold text-[#111211]">
                            2do Lugar {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 2 && "(Premio TOP 2)"}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 2
                              ? `${activeLeaderboard.prize_title || "Premios del Evento"}`
                              : "Reconocimiento destacado"}
                          </p>
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className={`p-3.5 border rounded-2xl flex gap-3.5 items-center ${activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 3 ? 'bg-[#fed600]/10 border-[#fed600]/30' : 'bg-slate-50 border-slate-200/60'}`}>
                        <div className="text-2xl shrink-0">🥉</div>
                        <div>
                          <div className="font-bold text-[#111211]">
                            3er Lugar {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 3 && "(Premio TOP 3)"}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 3
                              ? `${activeLeaderboard.prize_title || "Premios del Evento"}`
                              : "Reconocimiento destacado"}
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
                        <span 
                          className="absolute -bottom-1 -right-1 w-5 h-5 text-white text-[10px] font-black rounded-full flex items-center justify-center rank-number"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          2
                        </span>
                      </div>
                      {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 2 && (
                        <div 
                          className="mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none"
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          Ganador
                        </div>
                      )}
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
                    className="w-full rounded-t-2xl shadow-md mt-4 relative overflow-hidden"
                    style={{ backgroundColor: secondaryColor }}
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
                      <div 
                        className="w-14 h-14 bg-yellow-100 border-2 rounded-full flex items-center justify-center text-2xl shadow-md relative z-20"
                        style={{ borderColor: primaryColor }}
                      >
                        🥇
                        <span 
                          className="absolute -bottom-1 -right-1 w-6 h-6 text-xs font-black rounded-full flex items-center justify-center ring-2 ring-white rank-number"
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          1
                        </span>
                      </div>
                      <div 
                        className="mt-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none"
                        style={{ backgroundColor: secondaryColor, color: primaryColor }}
                      >
                        Ganador
                      </div>
                      <div 
                        className="mt-1.5 font-display text-sm sm:text-base font-black truncate max-w-[110px] uppercase tracking-wide"
                        style={{ color: secondaryColor }}
                      >
                        {podium.first.player_name || ""}
                      </div>
                      <div 
                        className="text-sm font-black drop-shadow-sm font-mono mt-0.5"
                        style={{ color: primaryColor }}
                      >
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
                    className="w-full rounded-t-2xl mt-4 relative overflow-hidden"
                    style={{ 
                      backgroundColor: primaryColor,
                      boxShadow: `0 4px 25px ${primaryColor}55`
                    }}
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
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-500 text-white text-[10px] font-black rounded-full flex items-center justify-center rank-number">
                          3
                        </span>
                      </div>
                      {activeLeaderboard?.prize_top_n && activeLeaderboard.prize_top_n >= 3 && (
                        <div 
                          className="mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none"
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          Ganador
                        </div>
                      )}
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
                    const isWithinWinnerLimit = row.rank <= (activeLeaderboard?.prize_top_n || 1);

                    let medalBadge = null;
                    let numBadgeStyle: React.CSSProperties = { color: "#94a3b8" };
                    let bgCircleStyle: React.CSSProperties = { backgroundColor: "rgba(241, 245, 249, 1)" };

                    if (isRank1) {
                      bgCircleStyle = { backgroundColor: primaryColor, color: secondaryColor };
                      numBadgeStyle = { color: secondaryColor, fontWeight: "900" };
                    } else if (isRank2) {
                      bgCircleStyle = { backgroundColor: secondaryColor, color: "white" };
                      numBadgeStyle = { color: "white", fontWeight: "900" };
                    } else if (isRank3) {
                      bgCircleStyle = { backgroundColor: "#4a4b4a", color: "white" };
                      numBadgeStyle = { color: "white", fontWeight: "900" };
                    } else if (isWithinWinnerLimit) {
                      bgCircleStyle = { backgroundColor: `${primaryColor}22`, color: primaryColor, borderWidth: '1.5px', borderStyle: 'solid', borderColor: primaryColor };
                      numBadgeStyle = { color: primaryColor, fontWeight: "900" };
                    } else {
                      numBadgeStyle = { color: "#64748b", fontWeight: "700" };
                      bgCircleStyle = { backgroundColor: "transparent" };
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
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-4 border-l-4 transition-all ${
                          isWithinWinnerLimit 
                            ? "bg-[#fed600]/5 hover:bg-[#fed600]/10" 
                            : "bg-white hover:bg-slate-50"
                        }`}
                        style={{ borderLeftColor: isWithinWinnerLimit ? primaryColor : "transparent" }}
                        layoutId={`player-row-${row.player_id}`}
                      >
                          {/* LEFT: Rank Num avatar circle & Competitor Name */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-mono shadow-sm"
                            style={bgCircleStyle}
                          >
                            <span className="rank-number" style={numBadgeStyle}>{row.rank}</span>
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
                              className="h-full rounded-full transition-all"
                              style={{
                                backgroundColor: isTop3 ? primaryColor : `${primaryColor}cc`
                              }}
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

                          {/* OUTLINE TROPHY BADGE (According to prize_top_n count) */}
                          {row.rank <= (activeLeaderboard?.prize_top_n || 1) && (
                            <div 
                              className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase rounded-lg tracking-widest flex items-center gap-1 shadow-sm select-none"
                              style={{
                                backgroundColor: `${primaryColor}1a`,
                                borderColor: `${primaryColor}4d`,
                                color: primaryColor,
                                borderStyle: "solid",
                                borderWidth: "1px"
                              }}
                            >
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
