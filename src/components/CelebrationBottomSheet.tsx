import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Target,
  Trophy,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle2,
  X,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MilestoneInfo } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  orderIndex: number;
  streakDays: number;
  milestoneInfo: MilestoneInfo;
  onOpenMural: () => void;
  onScrollToHints?: () => void;
}

export const CelebrationBottomSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  studentName,
  orderIndex,
  streakDays,
  milestoneInfo,
  onOpenMural,
  onScrollToHints,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: milestoneInfo.isMilestoneJustUnlocked ? 90 : 50,
          spread: 75,
          origin: { y: 0.8 },
          colors: ['#2563eb', '#f59e0b', '#10b981', '#6366f1'],
        });
      } catch {
        // Ignora em caso de não suporte a canvas
      }
    }
  }, [isOpen, milestoneInfo.isMilestoneJustUnlocked]);

  if (!isOpen) return null;

  const {
    isFirstQuestion,
    isMilestoneJustUnlocked,
    unlockedTarget,
    nextTarget,
    target,
    currentTotal,
    progressPercentage,
    remaining,
    celebrationMessage,
  } = milestoneInfo;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
        {/* Backdrop suave clicável para fechar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs pointer-events-auto"
        />

        {/* Gaveta Inferior (Bottom Sheet) */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-2xl mx-auto bg-white rounded-t-3xl border-t border-x border-slate-200 shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col font-sans"
        >
          {/* Alça superior (Drag Handle) */}
          <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          <div className="px-5 sm:px-7 pb-6 overflow-y-auto space-y-4">
            {/* Cabeçalho do Card */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resposta Correta! Presença Garantida</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  PARABÉNS, {studentName.toUpperCase()}! 🎉
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {orderIndex > 0 ? (
                    <>
                      Você é o <span className="font-bold text-blue-700">#{orderIndex}º</span> aluno a concluir a questão de hoje.
                    </>
                  ) : (
                    'Questão de hoje concluída com sucesso!'
                  )}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0 mt-1"
                title="Fechar e ver resolução"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indicadores Principais: Ofensiva e Total Acumulado */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Ofensiva
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {streakDays} {streakDays === 1 ? 'Dia Iniciado' : 'Dias Ativos'}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Total Acumulado
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {currentTotal} {currentTotal === 1 ? 'Questão' : 'Questões'}
                  </div>
                </div>
              </div>
            </div>

            {/* Linha Divisória */}
            <div className="border-t border-slate-200/80" />

            {/* Bloco de Metas da Turma */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4">
              {/* CENÁRIO 1: PRIMEIRA QUESTÃO FEITA */}
              {isFirstQuestion && (
                <div>
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs sm:text-sm mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span className="uppercase tracking-wide">
                      🚀 Sua Primeira Meta na Turma: Chegar a 3 Questões!
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Você deu o primeiro passo! Mantenha a constância: faltam só{' '}
                    <strong className="text-slate-900 font-bold">2 questões</strong> para bater sua primeira meta oficial.
                  </p>

                  {/* Barra de Progresso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Progresso da Meta</span>
                      <span>1/3 questões</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
                        style={{ width: '33.3%' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CENÁRIO 2: MARCO DESBLOQUEADO NESTA RESOLUÇÃO */}
              {!isFirstQuestion && isMilestoneJustUnlocked && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs sm:text-sm">
                      <Trophy className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                      <span>MARCO DE {unlockedTarget} QUESTÕES CONQUISTADO! 🎉</span>
                    </div>
                    <p className="text-xs text-amber-900 font-medium mt-1">
                      {celebrationMessage || 'Você construiu um hábito forte de estudo!'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        Próximo Desafio: Alcançar o Marco de {nextTarget} Questões
                      </span>
                      <span className="text-blue-700">
                        {currentTotal}/{nextTarget}
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-linear-to-r from-blue-600 to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 text-right font-medium">
                      Faltam {remaining} {remaining === 1 ? 'questão' : 'questões'} para o próximo nível!
                    </p>
                  </div>
                </div>
              )}

              {/* CENÁRIO 3: DIA REGULAR DE CAMINHADA */}
              {!isFirstQuestion && !isMilestoneJustUnlocked && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      Rumo ao Marco de {target} Questões
                    </span>
                    <span className="text-blue-700 font-extrabold">
                      {currentTotal}/{target} ({progressPercentage}%)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {remaining === 1 ? (
                      <>
                        Falta apenas <strong className="text-blue-700 font-bold">1 questão</strong> para desbloquear o Marco de {target} Questões!
                      </>
                    ) : (
                      <>
                        Faltam <strong className="text-blue-700 font-bold">{remaining} questões</strong> para bater a meta de {target} questões.
                      </>
                    )}
                  </p>

                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, progressPercentage)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ações Inferiores */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMural();
                }}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Ver Mural da Turma</span>
              </button>

              {onScrollToHints && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onScrollToHints();
                  }}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer shrink-0"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>Ver Resolução</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
