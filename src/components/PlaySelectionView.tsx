import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, RefreshCw, Database, ChevronRight } from 'lucide-react';
import { fetchLeaderboardsSupabase } from '../dataService';
import { LeaderboardInfo } from '../types';

export default function PlaySelectionView() {
  const [leaderboardsList, setLeaderboardsList] = useState<LeaderboardInfo[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    loadLeaderboardsList();
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-between" id="view-play-select">
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
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        <div className="bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/10 rounded-full blur-3xl" />
          <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow mb-5">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-display font-bold tracking-tight text-brand-light mb-1">
            Selecciona tu Trivia
          </h2>
          <p className="text-xs text-text-body mb-6">
            Elige uno de los eventos de trivia activos para registrarte y competir en vivo.
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
                        navigate(`/play/${board.id}`);
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
        </div>
      </main>
      <footer className="py-4 border-t border-border-default bg-bg-subtle text-center">
        <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest select-none">
          Trivia Event • Presencial interactivo • Producido por AI Studio 
        </p>
      </footer>
    </div>
  );
}
