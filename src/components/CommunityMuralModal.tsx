import React from 'react';
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
  if (!isOpen) return null;

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
                {cycleNumber && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Dia #{cycleNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {submissions.length}{' '}
                {submissions.length === 1
                  ? 'colega concluiu a questão'
                  : 'colegas concluíram a questão'}
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
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {submissions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Ninguém concluiu ainda hoje.</p>
              <p className="text-xs text-slate-400 mt-1">
                Seja o primeiro a resolver a questão do dia para abrir o Mural!
              </p>
            </div>
          ) : (
            submissions.map((sub, index) => {
              const num = String(index + 1).padStart(2, '0');
              const isCurrentUser =
                currentStudentNick &&
                sub.nickname.toLowerCase() === currentStudentNick.toLowerCase();

              return (
                <div
                  key={sub.id || `${sub.studentId}_${index}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
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

                  <div className="flex items-center gap-2 shrink-0">
                    {sub.unlockedMilestone && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        Marco de {sub.unlockedMilestone}!
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                      {sub.streakDays} {sub.streakDays === 1 ? 'dia' : 'dias'}
                    </span>
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
