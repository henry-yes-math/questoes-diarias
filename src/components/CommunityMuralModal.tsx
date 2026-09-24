import React, { useState } from 'react';
import { X, Flame, Users, Sparkles, Trophy } from 'lucide-react';
import { DailySubmission } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  submissions: DailySubmission[];
  currentStudentNick?: string;
  cycleNumber?: number;
}

export const CommunityMuralModal: React.FC<Props> = ({
  isOpen,
  onClose,
  submissions,
  currentStudentNick,
  cycleNumber,
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleTooltip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTooltipId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header do Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Mural da Turma
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hoje
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {submissions.length === 0
                  ? 'Desafio de hoje liberado'
                  : `${submissions.length} ${
                      submissions.length === 1
                        ? 'colega concluiu a questão'
                        : 'colegas concluíram a questão'
                    }`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fechar mural"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Alunos */}
        <div
          onClick={() => setActiveTooltipId(null)}
          className="p-6 overflow-y-auto flex-1 space-y-2"
        >
          {submissions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                A vaga #01 de hoje está aberta!
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Resolva a questão agora para liderar o mural da turma do dia.
              </p>
            </div>
          ) : (
            submissions.map((sub, index) => {
              const num = String(index + 1).padStart(2, '0');
              const isCurrentUser =
                currentStudentNick &&
                sub.nickname.toLowerCase() === currentStudentNick.toLowerCase();

              const subId = sub.id || `${sub.studentId}_${index}`;
              const milestoneTooltipId = `milestone_${subId}`;
              const streakTooltipId = `streak_${subId}`;

              return (
                <div
                  key={subId}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all relative ${
                    isCurrentUser
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                      : 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-400 w-6">
                      {num}.
                    </span>
                    <span className="text-sm font-semibold truncate">
                      {sub.nickname}
                      {isCurrentUser && (
                        <span className="ml-2 text-[11px] font-normal px-1.5 py-0.5 rounded bg-blue-200/70 text-blue-800">
                          Você
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 relative">
                    {sub.unlockedMilestone && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => handleToggleTooltip(milestoneTooltipId, e)}
                          title={`Marco de consistência: ${sub.unlockedMilestone} questões resolvidas!`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 hover:bg-amber-200/90 active:scale-95 px-2 py-0.5 rounded-md border border-amber-200/60 cursor-pointer transition-all"
                        >
                          <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="sm:hidden">{sub.unlockedMilestone}Q</span>
                          <span className="hidden sm:inline">Marco de {sub.unlockedMilestone}!</span>
                        </button>

                        {/* Balão flutuante no toque/clique */}
                        {activeTooltipId === milestoneTooltipId && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1.5 z-30 w-52 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl border border-slate-700 leading-snug animate-in fade-in zoom-in-95 duration-150"
                          >
                            <span className="font-bold text-amber-300">🏆 Marco atingido:</span>{' '}
                            {sub.unlockedMilestone} questões resolvidas no total!
                            <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => handleToggleTooltip(streakTooltipId, e)}
                        title={`Ofensiva ativa: ${sub.streakDays} ${sub.streakDays === 1 ? 'dia consecutivo' : 'dias consecutivos'}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100/90 active:scale-95 px-2 py-0.5 rounded-md border border-orange-200/60 cursor-pointer transition-all"
                      >
                        <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                        {sub.streakDays} {sub.streakDays === 1 ? 'dia' : 'dias'}
                      </button>

                      {/* Balão flutuante no toque/clique */}
                      {activeTooltipId === streakTooltipId && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl border border-slate-700 leading-snug animate-in fade-in zoom-in-95 duration-150"
                        >
                          <span className="font-bold text-orange-400">🔥 Ofensiva ativa:</span>{' '}
                          {sub.streakDays} {sub.streakDays === 1 ? 'dia consecutivo de estudo' : 'dias consecutivos de estudo'}!
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Lista ordenada por ordem de conclusão de hoje</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
