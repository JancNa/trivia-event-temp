/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Question, LeaderboardRow, LeaderboardInfo, Answer, Player } from '../types';
import { 
  fetchQuestions, 
  fetchLeaderboard, 
  addQuestion, 
  updateQuestion, 
  deleteQuestion, 
  resetEventData, 
  fetchActiveLeaderboardInfo,
  updateActiveLeaderboardStatus,
  fetchAdminPlayersList,
  fetchPlayerAnswersDetail,
  isDemoMode,
  setDemoMode,
  subscribeToRealtimeAnswers,
  insertMockCompetitor,
  fetchLeaderboardsSupabase,
  createLeaderboardSupabase
} from '../dataService';
import { 
  Trophy, 
  BarChart3, 
  Users, 
  HelpCircle, 
  RefreshCw, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Lock, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Award,
  Menu,
  Sparkles,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminView() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'stats' | 'players' | 'questions'>('leaderboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selected dynamic leaderboard state
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState('00000000-0000-0000-0000-000000000001');
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardInfo[]>([]);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  // DB Data States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, Answer[]>>({});
  
  // Loading & Refresh states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // Demo state
  const [demoActive, setDemoActive] = useState(isDemoMode());

  // Interactive configurations
  const [prizeTier, setPrizeTier] = useState<'top1' | 'top3'>('top3');
  const [showResetModal, setShowResetModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Question Form modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'a' as 'a' | 'b' | 'c' | 'd',
    xp_value: 100,
    time_limit_seconds: 15,
    order_index: 1
  });

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  };

  // Main data loader
  const loadAllAdminData = async (showRefreshIndicator = false, targetId = selectedLeaderboardId) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      // 0. Fetch list of available leaderboards
      const boards = await fetchLeaderboardsSupabase();
      setLeaderboardList(boards);

      // Verify the target ID still exists or default to first
      let currentId = targetId;
      if (boards.length > 0 && !boards.some(b => b.id === targetId)) {
        currentId = boards[0].id;
        setSelectedLeaderboardId(currentId);
      }

      // 1. Fetch questions
      const qList = await fetchQuestions(currentId);
      setQuestions(qList);

      // 2. Fetch leaderboard results
      const lbRows = await fetchLeaderboard(currentId);
      setLeaderboard(lbRows);

      // 3. Fetch active leaderboard info
      const boardInfo = await fetchActiveLeaderboardInfo(currentId);
      setActiveLeaderboard(boardInfo);

      // 4. Fetch players list
      const playerList = await fetchAdminPlayersList(currentId);
      setPlayers(playerList);

      // Default next order index
      if (!editingQuestionId) {
        const maxIndex = qList.reduce((max, current) => current.order_index > max ? current.order_index : max, 0);
        setFormData(prev => ({ ...prev, order_index: maxIndex + 1 }));
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error al cargar datos del servidor', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load, background auto-refresh & realtime subscription
  useEffect(() => {
    loadAllAdminData(false, selectedLeaderboardId);

    // Auto refresh every 30 seconds as fallback
    const interval = setInterval(() => {
      loadAllAdminData(false, selectedLeaderboardId);
    }, 30000);

    // Supabase / Simulated Realtime PG subscription
    const unsubscribe = subscribeToRealtimeAnswers(() => {
      loadAllAdminData(false, selectedLeaderboardId);
      showToast('¡Leaderboard actualizado en tiempo real!', 'info');
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [demoActive, selectedLeaderboardId]);

  // Handle DB environment toggling
  const handleToggleDemo = (val: boolean) => {
    setDemoActive(val);
    setDemoMode(val);
    setLoading(true);
    setSelectedLeaderboardId('00000000-0000-0000-0000-000000000001');
    showToast(val ? 'Cambiado a modo de Prueba Local offline' : 'Cambiado a conexión de Supabase en vivo', 'info');
  };

  // Tab navigation content selector
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Reset core event data
  const handleResetEventConfirm = async () => {
    try {
      const ok = await resetEventData(selectedLeaderboardId);
      if (ok) {
        showToast('¡Dinámica reiniciada! Se eliminaron los jugadores y respuestas asociadas.', 'success');
        setPlayerAnswers({});
        setExpandedPlayerId(null);
        loadAllAdminData(false, selectedLeaderboardId);
      } else {
        showToast('Ocurrió un error al limpiar el leaderboard.', 'error');
      }
    } catch (err) {
      showToast('Error durante la solicitud de limpieza.', 'error');
    } finally {
      setShowResetModal(false);
    }
  };

  // Toggle active leaderboard status: draft / active / finished
  const handleUpdateStatus = async (status: 'draft' | 'active' | 'finished') => {
    setStatusUpdating(true);
    try {
      const ok = await updateActiveLeaderboardStatus(status, selectedLeaderboardId);
      if (ok) {
        showToast(`Estado de la dinámica cambiado a: ${status.toUpperCase()}`, 'success');
        if (activeLeaderboard) {
          setActiveLeaderboard({ ...activeLeaderboard, status: status as any });
        }
        // reload leaderboard list for consistency
        const boards = await fetchLeaderboardsSupabase();
        setLeaderboardList(boards);
      } else {
        showToast('Error al actualizar el estado en la base de datos.', 'error');
      }
    } catch (err) {
      showToast('Error al enviar actualización de estado.', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Expand player detailed responses
  const handleTogglePlayerExpand = async (playerId: string) => {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null);
      return;
    }
    
    setExpandedPlayerId(playerId);

    if (!playerAnswers[playerId]) {
      setLoadingDetailId(playerId);
      try {
        const details = await fetchPlayerAnswersDetail(playerId, selectedLeaderboardId);
        setPlayerAnswers(prev => ({ ...prev, [playerId]: details }));
      } catch (err) {
        showToast('No se pudieron recuperar las respuestas del jugador.', 'error');
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  // Save (Add or Update) Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.option_a.trim() || !formData.option_b.trim()) {
      showToast('Por favor diligencie la pregunta y las opciones principales.', 'error');
      return;
    }

    try {
      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, formData);
        showToast('¡Pregunta actualizada con éxito!', 'success');
      } else {
        await addQuestion(formData, selectedLeaderboardId);
        showToast('¡Nueva pregunta agregada con éxito!', 'success');
      }
      
      // Close modal & reset form
      setShowQuestionModal(false);
      setEditingQuestionId(null);
      setFormData({
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'a',
        xp_value: 100,
        time_limit_seconds: 15,
        order_index: questions.length + 1
      });
      loadAllAdminData(false, selectedLeaderboardId);
    } catch (err) {
      showToast('Ocurrió un problema al guardar la pregunta.', 'error');
    }
  };

  // Edit question modal opener
  const handleOpenEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormData({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      xp_value: q.xp_value,
      time_limit_seconds: q.time_limit_seconds || 15,
      order_index: q.order_index
    });
    setShowQuestionModal(true);
  };

  // Delete question confirm
  const handleDeleteQuestion = async (id: string, text: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar la pregunta:\n"${text}"?`)) return;
    try {
      const ok = await deleteQuestion(id);
      if (ok) {
        showToast('Pregunta eliminada de la base de datos.', 'success');
        loadAllAdminData(false, selectedLeaderboardId);
      } else {
        showToast('Error al suprimir la pregunta.', 'error');
      }
    } catch (err) {
      showToast('Error al solicitar supresión.', 'error');
    }
  };

  // Download Winners CSV
  const handleExportCSV = () => {
    const limit = prizeTier === 'top1' ? 1 : 3;
    const winners = leaderboard.slice(0, limit);
    if (winners.length === 0) {
      showToast('No hay ganadores registrados que exportar.', 'error');
      return;
    }

    const headers = 'posicion,nombre,total_xp,correct_answers\n';
    const rows = winners.map(w => `${w.rank},"${w.name.replace(/"/g, '""')}",${w.total_xp},${w.correct_answers}`).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ganadores_trivia_${prizeTier}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('¡Archivo CSV de ganadores exportado correctamente!');
  };

  // Quick insert mock simulator player for testing
  const handleAddMockPlayer = () => {
    const mockNames = ['Diana Prince', 'Bruce Wayne', 'Clark Kent', 'Tony Stark', 'Steve Rogers', 'Peter Parker', 'Wanda Maximoff', 'Natasha Romanoff'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)] + ` #${Math.floor(Math.random() * 900 + 100)}`;
    insertMockCompetitor(randomName, 0.4 + Math.random() * 0.6, selectedLeaderboardId);
    loadAllAdminData(false, selectedLeaderboardId);
    showToast(`Simulador: Agregado jugador de prueba "${randomName}" con respuestas automáticas.`);
  };

  // Handle new leaderboard creation
  const handleCreateLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) {
      showToast('Por favor ingrese un nombre para el evento de trivia.', 'error');
      return;
    }
    setCreatingBoard(true);
    try {
      const board = await createLeaderboardSupabase(newBoardName, 'Creado desde el panel de control admin');
      showToast(`¡Trivia "${board.name}" creada con éxito!`, 'success');
      setShowNewBoardModal(false);
      setNewBoardName('');
      
      // Update list and select this new board
      const boards = await fetchLeaderboardsSupabase();
      setLeaderboardList(boards);
      setSelectedLeaderboardId(board.id);
      
      // Load newly created dynamic's questions, players, and states
      loadAllAdminData(false, board.id);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || err?.details || 'Ocurrió un error al crear la nueva dinámica.';
      showToast(`Error: ${errMsg}`, 'error');
    } finally {
      setCreatingBoard(false);
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Metric computations for Stats section
  const computedStats = {
    totalPlayers: players.length,
    totalAnswers: leaderboard.reduce((acc, r) => acc + (r.total_answers || 0), 0),
    completionPercentage: (() => {
      const totalQuestionsCount = questions.length;
      if (totalQuestionsCount === 0 || players.length === 0) return 0;
      const finishedCount = leaderboard.filter(r => r.total_answers >= totalQuestionsCount).length;
      return Math.round((finishedCount / players.length) * 100);
    })(),
    averageXP: (() => {
      if (leaderboard.length === 0) return 0;
      const sum = leaderboard.reduce((acc, r) => acc + (r.total_xp || 0), 0);
      return Math.round(sum / leaderboard.length);
    })()
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-brand-light p-6">
        <RefreshCw className="w-12 h-12 text-brand-yellow animate-spin mb-4" />
        <p className="text-sm font-mono text-neutral-400">Iniciando panel administrativo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light flex flex-col md:flex-row relative">

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3.5 rounded-2xl border text-xs font-bold shadow-2xl ${
              toast.type === 'error'
                ? 'bg-red-900/90 border-red-500 text-red-200'
                : toast.type === 'info'
                  ? 'bg-neutral-900/90 border-brand-yellow/50 text-brand-yellow'
                  : 'bg-bg-elevated border-emerald-500 text-emerald-400'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE NAVBAR TRIGGER */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border-default/60 bg-bg-subtle z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center text-[#111211] font-black text-sm">
            T
          </div>
          <span className="font-display font-extrabold text-sm tracking-tight">TRIVIA CONTROL</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 border border-border-default rounded-xl bg-bg-elevated hover:bg-neutral-800"
          aria-label="Abrir Menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r border-border-default bg-bg-subtle p-5 flex flex-col justify-between shrink-0 transition-transform duration-300 z-30 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* Brand logotype */}
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-border-default">
            <div className="w-10 h-10 rounded-xl bg-brand-yellow flex items-center justify-center text-[#111211] font-display font-black text-lg shadow-lg">
              T
            </div>
            <div>
              <h2 className="font-display font-black tracking-tight text-md leading-none text-brand-light">
                TRIVIA <span className="text-brand-yellow">LIVE</span>
              </h2>
              <span className="text-[10px] text-text-secondary font-mono font-semibold uppercase tracking-wider">
                Consola Admin
              </span>
            </div>
          </div>

          {/* SELECCIÓN DE TRIVIA / LEADERBOARD */}
          <div className="bg-bg-elevated/40 border border-border-default/80 rounded-2xl p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-brand-yellow font-extrabold uppercase tracking-wider font-mono flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>Trivia Activa</span>
              </span>
              <button
                onClick={() => {
                  setNewBoardName('');
                  setShowNewBoardModal(true);
                }}
                className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-brand-yellow/50 rounded-lg text-brand-yellow hover:scale-105 transition-all cursor-pointer shadow"
                title="Crear Nueva Dinámica"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedLeaderboardId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setSelectedLeaderboardId(targetId);
                }}
                className="w-full bg-bg-subtle hover:bg-bg-elevated/85 border border-border-default hover:border-brand-yellow/35 rounded-xl p-2.5 text-[11px] font-bold text-white pr-7 focus:outline-none focus:border-brand-yellow cursor-pointer appearance-none transition-all shadow-inner"
              >
                {leaderboardList.map(board => (
                  <option key={board.id} value={board.id} className="bg-neutral-950 font-sans py-2 font-bold text-white text-[11px]">
                    🏆 {board.name} ({board.status?.toUpperCase() || 'DRAFT'})
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Core navigation buttons */}
          <nav className="space-y-1.5" aria-label="Menú principal">
            <button
              onClick={() => selectTab('leaderboard')}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all hover:bg-bg-elevated group cursor-pointer ${
                activeTab === 'leaderboard' ? 'bg-brand-yellow text-[#111211] font-extrabold' : 'text-text-secondary hover:text-brand-light'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>1. 🏆 Leaderboard</span>
            </button>
            
            <button
              onClick={() => selectTab('stats')}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all hover:bg-bg-elevated group cursor-pointer ${
                activeTab === 'stats' ? 'bg-brand-yellow text-[#111211] font-extrabold' : 'text-text-secondary hover:text-brand-light'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>2. 📊 Estadísticas</span>
            </button>

            <button
              onClick={() => selectTab('players')}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all hover:bg-bg-elevated group cursor-pointer ${
                activeTab === 'players' ? 'bg-brand-yellow text-[#111211] font-extrabold' : 'text-text-secondary hover:text-brand-light'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>3. 👥 Jugadores</span>
            </button>

            <button
              onClick={() => selectTab('questions')}
              className={`w-full py-3 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all hover:bg-bg-elevated group cursor-pointer ${
                activeTab === 'questions' ? 'bg-brand-yellow text-[#111211] font-extrabold' : 'text-text-secondary hover:text-brand-light'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>4. ❓ Preguntas</span>
            </button>
          </nav>
        </div>

        {/* Dynamic Database configuration at base */}
        <div className="space-y-4 pt-4 border-t border-border-default text-xs">
          {/* Quick simulator tester block */}
          <button 
            onClick={handleAddMockPlayer}
            className="w-full py-2.5 px-3 border border-dashed border-brand-yellow/40 hover:border-brand-yellow/85 rounded-xl text-brand-yellow text-[11px] font-bold text-center bg-brand-yellow/5 hover:bg-brand-yellow/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Suma un competidor simulado que responde aleatoriamente."
          >
            <Sparkles className="w-3.5 h-3.5" />
            + Competidor Demo
          </button>

          <div className="bg-bg-elevated rounded-2xl p-3 space-y-2 border border-border-default/60">
            <span className="text-[10px] uppercase font-bold text-text-secondary block font-mono">
              Bases de Datos conectada
            </span>
            <div className="flex gap-1 bg-bg-subtle p-1 rounded-xl">
              <button 
                onClick={() => handleToggleDemo(true)}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer ${
                  demoActive ? 'bg-brand-yellow text-[#111211]' : 'text-text-secondary hover:text-brand-light'
                }`}
              >
                Local
              </button>
              <button 
                onClick={() => handleToggleDemo(false)}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer ${
                  !demoActive ? 'bg-brand-yellow text-[#111211] font-bold' : 'text-text-secondary hover:text-brand-light'
                }`}
              >
                Supabase
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY FOR SIDEBAR */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-20"
        />
      )}

      {/* MAIN VIEW AREA */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 space-y-6 md:h-screen md:overflow-y-auto">

        {/* FIXED HEADER BAR */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-brand-yellow font-bold uppercase tracking-wider font-mono">
              <Sliders className="w-3.5 h-3.5" />
              <span>Dinámica y Evento Activo</span>
            </div>
            <h1 className="text-xl lg:text-3xl font-display font-extrabold tracking-tight text-white flex items-center gap-2">
              🏆 {activeLeaderboard ? activeLeaderboard.name : 'Trivia Event Principal'}
            </h1>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3">
            {/* Status indicators */}
            <div className="flex items-center gap-1.5 bg-bg-subtle border border-border-default/80 px-2 py-1.5 rounded-2xl text-xs font-bold leading-none">
              <span className="text-[10px] text-text-secondary uppercase pl-1.5">Estado:</span>
              
              <button 
                onClick={() => handleUpdateStatus('draft')}
                disabled={statusUpdating}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  activeLeaderboard?.status === 'draft' 
                    ? 'bg-neutral-600 text-white font-extrabold shadow' 
                    : 'text-text-secondary hover:text-brand-light hover:bg-neutral-800'
                }`}
              >
                Draft
              </button>

              <button 
                onClick={() => handleUpdateStatus('active')}
                disabled={statusUpdating}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  activeLeaderboard?.status === 'active' 
                    ? 'bg-emerald-600 text-white font-extrabold shadow' 
                    : 'text-text-secondary hover:text-emerald-400 hover:bg-neutral-850'
                }`}
              >
                Active
              </button>

              <button 
                onClick={() => handleUpdateStatus('finished')}
                disabled={statusUpdating}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  activeLeaderboard?.status === 'finished' 
                    ? 'bg-red-700/50 border border-red-500 text-red-100 font-extrabold shadow' 
                    : 'text-text-secondary hover:text-red-450 hover:bg-neutral-850'
                }`}
              >
                Finished
              </button>
            </div>

            {/* Reload and reset tools */}
            <button
              onClick={() => loadAllAdminData(true)}
              className="p-3 bg-bg-subtle hover:bg-bg-elevated rounded-2xl border border-border-default text-text-secondary hover:text-brand-light transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Refrescar datos de la base de datos de inmediato"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-yellow' : ''}`} />
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-3 bg-red-900/40 hover:bg-red-955 border border-red-550 rounded-2xl text-red-200 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow cursor-pointer shrink-0"
              title="Limpia todos los jugadores y respuestas cargados de esta dinámica"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Reiniciar evento</span>
            </button>
          </div>
        </header>

        {/* SECTOR RENDER BASED ON TAB */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1:🏆 LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <motion.section
              key="tab-leaderboard font-medium"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border-default/60 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-display font-semibold text-brand-light flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-brand-yellow shrink-0" />
                      <span>Tabla de Resultados en Tiempo Real</span>
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Sincronizado instantáneamente con las respuestas enviadas por los participantes.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {leaderboard.length === 0 ? (
                    <div className="py-16 text-center text-text-secondary border border-dashed border-border-default rounded-3xl">
                      <Users className="w-10 h-10 mx-auto text-text-secondary mb-3 opacity-50" />
                      <p className="text-sm font-semibold text-brand-light">Ningún participante registrado</p>
                      <p className="text-xs mt-1 text-text-secondary">Alienta a los usuarios a registrarse y responder las preguntas.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border-default text-text-secondary uppercase tracking-widest font-extrabold text-[10px]">
                          <th className="py-3 px-4 text-center w-16">Posición</th>
                          <th className="py-3 px-3">Nombre del Participante</th>
                          <th className="py-3 px-3 text-center">XP Acumulado</th>
                          <th className="py-3 px-3 text-center">✓ Correctas</th>
                          <th className="py-3 px-3 text-center">Respondidas</th>
                          <th className="py-3 px-4 text-center">Última Actividad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default font-semibold text-brand-light/90">
                        {leaderboard.map((row) => {
                          const isTop1 = row.rank === 1;
                          const isTop2 = row.rank === 2;
                          const isTop3 = row.rank === 3;
                          return (
                            <tr 
                              key={row.player_id} 
                              className={`hover:bg-bg-elevated/35 transition-all ${
                                isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-neutral-300/5' : isTop3 ? 'bg-amber-700/5' : ''
                              }`}
                            >
                              <td className="py-4 px-4 text-center">
                                {isTop1 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-yellow-500 text-bg-default font-black font-mono text-center shadow-md">
                                    1🥇
                                  </span>
                                ) : isTop2 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-300 text-bg-default font-black font-mono text-center shadow-md">
                                    2🥈
                                  </span>
                                ) : isTop3 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-600 text-brand-light font-black font-mono text-center shadow-md">
                                    3🥉
                                  </span>
                                ) : (
                                  <span className="text-text-secondary font-mono font-bold">
                                    #{row.rank}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-3 font-extrabold text-sm text-white">
                                {row.name}
                              </td>
                              <td className="py-4 px-3 text-center text-brand-yellow font-bold font-mono text-sm">
                                {row.total_xp?.toLocaleString() || 0} XP
                              </td>
                              <td className="py-4 px-3 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 font-extrabold font-mono">
                                  {row.correct_answers || 0}
                                </span>
                              </td>
                              <td className="py-4 px-3 text-center text-text-secondary font-mono">
                                {row.total_answers || 0}
                              </td>
                              <td className="py-4 px-4 text-center text-text-secondary font-mono">
                                {formatTimestamp(row.last_answer_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* PANEL DE PREMIACIÓN */}
              <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default/60 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-md font-display font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-brand-yellow" />
                      <span>Panel de Premiación y Cierre</span>
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Selecciona y destaca el ranking de los ganadores de la jornada.
                    </p>
                  </div>
                  
                  {/* Selector of tiers */}
                  <div className="flex items-center gap-1.5 bg-bg-elevated p-1 rounded-xl border border-border-default w-fit text-xs font-semibold">
                    <button
                      onClick={() => setPrizeTier('top1')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        prizeTier === 'top1' ? 'bg-brand-yellow text-[#111211] font-bold' : 'text-text-secondary hover:text-brand-light'
                      }`}
                    >
                      Premio Top 1
                    </button>
                    <button
                      onClick={() => setPrizeTier('top3')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        prizeTier === 'top3' ? 'bg-brand-yellow text-[#111211] font-bold' : 'text-text-secondary hover:text-brand-light'
                      }`}
                    >
                      Premio Top 3
                    </button>
                  </div>
                </div>

                {/* PODIUM OF WINNERS VISUALIZATION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leaderboard.length === 0 ? (
                    <div className="col-span-1 md:col-span-3 py-6 text-center text-xs text-text-secondary">
                      Registra jugadores para calcular el podio final.
                    </div>
                  ) : (
                    leaderboard.slice(0, prizeTier === 'top1' ? 1 : 3).map((win, idx) => {
                      const isFirst = idx === 0;
                      const isSecond = idx === 1;
                      const isThird = idx === 2;
                      return (
                        <div 
                          key={win.player_id}
                          className={`border rounded-2xl p-4 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all ${
                            isFirst 
                              ? 'bg-yellow-500/5 border-yellow-500/40 ring-1 ring-yellow-500/20' 
                              : isSecond 
                                ? 'bg-zinc-300/5 border-zinc-300/40' 
                                : 'bg-amber-600/5 border-amber-600/40'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-center text-bg-default font-black text-lg shadow-lg mb-3 ${
                            isFirst ? 'bg-yellow-500' : isSecond ? 'bg-zinc-300' : 'bg-amber-600 text-white'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="space-y-1 mb-4">
                            <span className="text-[10px] font-mono tracking-widest text-text-secondary uppercase">
                              {idx === 0 ? '🏆 Ganador de Oro' : idx === 1 ? '🥈 Subcampeón de Plata animate-pulse' : '🥉 Bronce'}
                            </span>
                            <h4 className="text-sm font-extrabold text-white truncate max-w-[150px]">
                              {win.name}
                            </h4>
                            <p className="text-xs font-mono font-bold text-brand-yellow">
                              {win.total_xp.toLocaleString()} XP
                            </p>
                          </div>
                          <div className="text-[11px] text-text-secondary font-medium">
                            {win.correct_answers} respuestas correctas
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 bg-bg-elevated hover:bg-neutral-800 border border-border-default rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    id="btn-export-winners-csv"
                  >
                    <Download className="w-4 h-4 text-brand-yellow" />
                    <span>Exportar ganadores CSV</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* TAB 2:📊 ESTADÍSTICAS */}
          {activeTab === 'stats' && (
            <motion.section
              key="tab-stats"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* STATS BENTO GRID CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1 */}
                <div className="bg-bg-subtle border border-border-default rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-extrabold text-text-secondary uppercase tracking-widest block">
                      Jugadores Registrados
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {computedStats.totalPlayers}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-3">
                    Participantes registrados.
                  </p>
                </div>

                {/* CARD 2 */}
                <div className="bg-bg-subtle border border-border-default rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-extrabold text-text-secondary uppercase tracking-widest block">
                      Respuestas Enviadas
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {computedStats.totalAnswers}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-3">
                    Transacciones en tiempo real.
                  </p>
                </div>

                {/* CARD 3 */}
                <div className="bg-bg-subtle border border-border-default rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-extrabold text-text-secondary uppercase tracking-widest block">
                      % Completitud
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {computedStats.completionPercentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-3">
                    Completaron todas las preguntas.
                  </p>
                </div>

                {/* CARD 4 */}
                <div className="bg-bg-subtle border border-border-default rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-extrabold text-text-secondary uppercase tracking-widest block">
                      XP Promedio
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {computedStats.averageXP.toLocaleString()} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-3">
                    Promedio acumulado.
                  </p>
                </div>

              </div>
            </motion.section>
          )}

          {/* TAB 3:👥 JUGADORES */}
          {activeTab === 'players' && (
            <motion.section
              key="tab-players"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl space-y-4">
                <div className="border-b border-border-default/60 pb-3">
                  <h2 className="text-md font-display font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-yellow" />
                    <span>Participantes Totales Registrados ({players.length})</span>
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Amplía cada registro para ver el rendimiento por pregunta acumulada.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  {players.length === 0 ? (
                    <div className="py-12 text-center text-text-secondary">
                      Ningún usuario se encuentra registrado en el momento.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border-default text-text-secondary uppercase tracking-widest font-extrabold text-[10px]">
                          <th className="py-3 px-3">Nombre</th>
                          <th className="py-3 px-3 text-center">XP Total</th>
                          <th className="py-3 px-3 text-center">✓ Correctas</th>
                          <th className="py-3 px-3 text-center">Respondidas / Total</th>
                          <th className="py-3 px-3">Registrado</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default font-semibold text-brand-light">
                        {players.map((plyr) => {
                          // Find corresponding summary row from leaderboard calculated values
                          const summary = leaderboard.find(r => r.player_id === plyr.id);
                          const totalXp = summary ? summary.total_xp : 0;
                          const correctCount = summary ? summary.correct_answers : 0;
                          const answeredCount = summary ? summary.total_answers : 0;
                          const isExpanded = expandedPlayerId === plyr.id;

                          return (
                            <React.Fragment key={plyr.id}>
                              <tr className={`hover:bg-bg-elevated/40 transition-all ${isExpanded ? 'bg-bg-elevated/25' : ''}`}>
                                <td className="py-3.5 px-3 font-extrabold text-sm text-white">
                                  {plyr.name}
                                </td>
                                <td className="py-3.5 px-3 text-center font-mono font-bold text-brand-yellow text-sm">
                                  {totalXp.toLocaleString()} XP
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                    {correctCount}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-center font-mono text-text-secondary">
                                  {answeredCount} / {questions.length}
                                </td>
                                <td className="py-3.5 px-3 font-mono text-text-secondary text-[11px]">
                                  {formatTimestamp(plyr.created_at)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => handleTogglePlayerExpand(plyr.id)}
                                    className="px-3 py-1.5 bg-bg-elevated hover:bg-neutral-800 border border-border-default rounded-xl font-bold cursor-pointer transition-all inline-flex items-center gap-1 hover:text-white"
                                  >
                                    <span>Ver detalle</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded answers detail */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="bg-bg-elevated/15 px-6 py-4">
                                      <div className="border border-border-default/80 rounded-2xl bg-bg-subtle p-4 space-y-4 shadow-inner">
                                        <h4 className="text-[10px] uppercase font-bold text-text-secondary font-mono tracking-widest flex items-center gap-1.5 border-b border-border-default/40 pb-2">
                                          <Clock className="w-3.5 h-3.5 text-brand-yellow animate-pulse" />
                                          <span>Historial de Respuestas Detalladas</span>
                                        </h4>
                                        
                                        {loadingDetailId === plyr.id ? (
                                          <div className="py-4 flex justify-center items-center gap-2 text-xs text-text-secondary font-mono">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-yellow" />
                                            <span>Buscando registros en Supabase...</span>
                                          </div>
                                        ) : !playerAnswers[plyr.id] || playerAnswers[plyr.id].length === 0 ? (
                                          <div className="py-4 text-center text-xs text-text-secondary bg-neutral-900/20 rounded-xl">
                                            El jugador no ha respondido ninguna pregunta de la trivia aún.
                                          </div>
                                        ) : (
                                          <div className="space-y-3.5">
                                            {playerAnswers[plyr.id].map((ans, aIdx) => {
                                              // Find corresponding question
                                              const associatedQ = questions.find(q => q.id === ans.question_id);
                                              return (
                                                <div 
                                                  key={ans.id || aIdx} 
                                                  className="p-3 bg-bg-elevated border border-border-default/40 rounded-xl hover:border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                                                >
                                                  <div className="space-y-1">
                                                    <span className="text-[9px] font-mono bg-bg-subtle text-text-secondary px-1.5 py-0.5 rounded border border-border-default">
                                                      Pregunta #{aIdx + 1}
                                                    </span>
                                                    <p className="font-extrabold text-white text-xs mt-1 leading-relaxed leading-snug">
                                                      {associatedQ ? associatedQ.question : '¿Pregunta Suprimida del Evento?'}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-text-secondary">
                                                      <span>Seleccionada: <strong className="uppercase text-brand-yellow font-mono">{ans.selected_option}</strong></span>
                                                      <span>•</span>
                                                      <span>Correcta: <strong className="uppercase text-emerald-400 font-mono">{associatedQ ? associatedQ.correct_option : '--'}</strong></span>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                                    <div className="text-right font-mono">
                                                      <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                                                        ans.is_correct 
                                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
                                                          : 'bg-red-950 text-red-400 border border-red-500/20'
                                                      }`}>
                                                        {ans.is_correct ? `+${ans.xp_earned} XP` : '0 XP (Incorrecto)'}
                                                      </span>
                                                      <span className="block text-[10px] text-text-secondary opacity-60 mt-0.5">
                                                        {formatTimestamp(ans.answered_at)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* TAB 4:❓ PREGUNTAS */}
          {activeTab === 'questions' && (
            <motion.section
              key="tab-questions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default/60 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-md font-display font-bold text-white flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-brand-yellow" />
                      <span>Banco de Preguntas para la Dinámica ({questions.length})</span>
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Administra las preguntas que aparecen secuencialmente en tiempo real para los jugadores.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingQuestionId(null);
                      setFormData({
                        question: '',
                        option_a: '',
                        option_b: '',
                        option_c: '',
                        option_d: '',
                        correct_option: 'a',
                        xp_value: 100,
                        time_limit_seconds: 15,
                        order_index: questions.length + 1
                      });
                      setShowQuestionModal(true);
                    }}
                    className="px-4 py-2.5 bg-brand-yellow text-[#111211] rounded-xl text-xs font-black cursor-pointer shadow hover:brightness-110 active:scale-95 transition-all text-nowrap flex items-center justify-center gap-1.5"
                    id="btn-add-question-open"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Pregunta</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {questions.length === 0 ? (
                    <div className="py-12 text-center text-text-secondary">
                      No hay preguntas formuladas para este leaderboard en el momento. Agrega una arriba.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs min-w-[800px]">
                      <thead>
                        <tr className="border-b border-border-default text-text-secondary uppercase tracking-widest font-extrabold text-[10px]">
                          <th className="py-3 px-3 text-center">Orden</th>
                          <th className="py-3 px-3">Pregunta</th>
                          <th className="py-3 px-3">Opción A</th>
                          <th className="py-3 px-3">Opción B</th>
                          <th className="py-3 px-3">Opción C</th>
                          <th className="py-3 px-3">Opción D</th>
                          <th className="py-3 px-3 text-center">✓</th>
                          <th className="py-3 px-3 text-center">XP</th>
                          <th className="py-3 px-3 text-center">⏱ Límit</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default font-semibold text-brand-light">
                        {questions.map((q) => (
                          <tr key={q.id} className="hover:bg-bg-elevated/40 transition-all">
                            <td className="py-4 px-3 text-center text-text-secondary font-mono">
                              #{q.order_index}
                            </td>
                            <td className="py-4 px-3 font-extrabold text-sm text-white max-w-xs truncate">
                              {q.question}
                            </td>
                            <td className="py-4 px-3 text-text-secondary max-w-[120px] truncate">{q.option_a}</td>
                            <td className="py-4 px-3 text-text-secondary max-w-[120px] truncate">{q.option_b}</td>
                            <td className="py-4 px-3 text-text-secondary max-w-[120px] truncate">{q.option_c || <span className="opacity-30">--</span>}</td>
                            <td className="py-4 px-3 text-text-secondary max-w-[120px] truncate">{q.option_d || <span className="opacity-30">--</span>}</td>
                            <td className="py-4 px-3 text-center">
                              <span className="uppercase text-emerald-400 bg-emerald-950 font-bold px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                {q.correct_option}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-center text-brand-yellow font-bold font-mono">
                              {q.xp_value}
                            </td>
                            <td className="py-4 px-3 text-center text-text-secondary font-mono">
                              {q.time_limit_seconds ? `${q.time_limit_seconds}s` : '∞'}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEdit(q)}
                                  className="p-2 bg-bg-elevated hover:bg-neutral-800 text-text-secondary hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Editar pregunta"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id, q.question)}
                                  className="p-2 bg-red-950/40 hover:bg-red-900 border border-red-950/60 hover:border-red-500 rounded-lg text-red-400 hover:text-white transition-all cursor-pointer"
                                  title="Eliminar pregunta"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.section>
          )}

        </AnimatePresence>

      </main>

      {/* FORM MODAL FOR ADD/EDIT QUESTION */}
      <AnimatePresence>
        {showQuestionModal && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-2xl max-w-xl w-full text-xs font-semibold space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-md font-display font-extrabold text-white">
                  {editingQuestionId ? '✏️ Editar Pregunta' : '➕ Agregar Nueva Pregunta'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="p-1.5 border border-border-default hover:bg-bg-elevated rounded-xl"
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                    Enunciado de la Pregunta
                  </label>
                  <textarea
                    rows={2}
                    value={formData.question}
                    onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Escriba la pregunta aquí..."
                    className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                      Opción A
                    </label>
                    <input
                      type="text"
                      value={formData.option_a}
                      onChange={(e) => setFormData(prev => ({ ...prev, option_a: e.target.value }))}
                      required
                      placeholder="Opción correcta o incorrecta..."
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-yellow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                      Opción B
                    </label>
                    <input
                      type="text"
                      value={formData.option_b}
                      onChange={(e) => setFormData(prev => ({ ...prev, option_b: e.target.value }))}
                      required
                      placeholder="Opción incorrecta o correcta..."
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-yellow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                      Opción C
                    </label>
                    <input
                      type="text"
                      value={formData.option_c}
                      onChange={(e) => setFormData(prev => ({ ...prev, option_c: e.target.value }))}
                      placeholder="Opcional..."
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-yellow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                      Opción D
                    </label>
                    <input
                      type="text"
                      value={formData.option_d}
                      onChange={(e) => setFormData(prev => ({ ...prev, option_d: e.target.value }))}
                      placeholder="Opcional..."
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-yellow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
                      Opción Correcta
                    </label>
                    <select
                      value={formData.correct_option}
                      onChange={(e) => setFormData(prev => ({ ...prev, correct_option: e.target.value as any }))}
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-yellow cursor-pointer"
                    >
                      <option value="a">A</option>
                      <option value="b">B</option>
                      <option value="c">C</option>
                      <option value="d">D</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
                      XP de Recompensa
                    </label>
                    <input
                      type="number"
                      value={formData.xp_value}
                      min={10}
                      max={10000}
                      onChange={(e) => setFormData(prev => ({ ...prev, xp_value: Number(e.target.value) }))}
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-yellow"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block" title="Límite en segundos">
                      Límite Tiempo
                    </label>
                    <input
                      type="number"
                      value={formData.time_limit_seconds}
                      min={5}
                      max={300}
                      onChange={(e) => setFormData(prev => ({ ...prev, time_limit_seconds: Number(e.target.value) }))}
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-yellow"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
                      Índice de Orden
                    </label>
                    <input
                      type="number"
                      value={formData.order_index}
                      min={1}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                      className="w-full bg-bg-elevated border border-border-default text-brand-light rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-yellow"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3.5 pt-4 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-4 py-2.5 bg-bg-elevated hover:bg-neutral-850 border border-border-default text-text-secondary rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-yellow hover:brightness-110 active:scale-95 text-[#111211] rounded-xl font-black cursor-pointer font-sans transition-all"
                    id="btn-save-question-submit"
                  >
                    Guardar Pregunta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REINICIAR EVENTO CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-2xl max-w-sm w-full text-xs font-semibold text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/50 flex flex-col items-center justify-center text-red-500 mx-auto">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                  ¿Reiniciar Evento de Trivia?
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Esta acción eliminará todos los jugadores registrados y sus respectivas respuestas de la base de datos de esta dinámica. Este paso es irreversible.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 bg-bg-elevated hover:bg-neutral-850 border border-border-default text-text-secondary rounded-xl font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetEventConfirm}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl font-extrabold cursor-pointer transition-all"
                  id="btn_confirm_reset_action"
                >
                  Confirmar Limpieza
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NUEVA DINÁMICA / EVENTO CREATOR MODAL */}
      <AnimatePresence>
        {showNewBoardModal && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-2xl max-w-sm w-full text-xs font-semibold text-center space-y-4"
            >
              <div className="space-y-1.5 text-center">
                <h3 className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                  <span className="text-xl">✨</span> Crear Nuevo Evento de Trivia
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Crea una nueva campaña o dinámica independiente con sus propias preguntas, jugadores y leaderboard.
                </p>
              </div>

              <form onSubmit={handleCreateLeaderboard} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
                    Nombre del Evento (ej: Trivia Q3, Desafío DevOps)
                  </label>
                  <input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="ej: Trivia de Ventas de Fin de Año"
                    className="w-full bg-bg-elevated border border-border-default hover:border-brand-yellow/40 text-brand-light placeholder:text-text-secondary/50 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-yellow"
                    maxLength={100}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewBoardModal(false)}
                    disabled={creatingBoard}
                    className="flex-1 py-2.5 bg-bg-elevated hover:bg-neutral-850 border border-border-default text-text-secondary rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBoard}
                    className="flex-1 py-2.5 bg-brand-yellow text-[#111211] rounded-xl font-black cursor-pointer transition-all text-center flex items-center justify-center disabled:opacity-50"
                  >
                    {creatingBoard ? 'Creando...' : 'Crear & Activar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
