import React, { useEffect } from 'react';
import { Flame, Target, Trophy, Sparkles, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MilestoneInfo } from '../types';

interface Props {
  studentName: string;
  orderIndex: number;
  streakDays: number;
  milestoneInfo: MilestoneInfo;
  onOpenMural: () => void;
}

export const CelebrationCard: React.FC<Props> = ({
  studentName,
  orderIndex,
  streakDays,
  milestoneInfo,
  onOpenMural,
}) => {
  useEffect(() => {
    // Efeito de confete ao concluir
    try {
      confetti({
        particleCount: milestoneInfo.isMilestoneJustUnlocked ? 90 : 45,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#2563eb', '#f59e0b', '#10b981', '#6366f1'],
      });
    } catch {
      // Ignora em ambientes sem canvas
    }
  }, [milestoneInfo.isMilestoneJustUnlocked]);

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
    nextMilestonePrompt,
  } = milestoneInfo;

  return (
    <div className="w-full bg-linear-to-b from-blue-50/70 via-white to-white rounded-2xl border border-blue-200/80 p-5 sm:p-7 shadow-lg relative overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Topo: Parabéns e Ordem */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-blue-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Resposta correta</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Parabéns, {studentName}! 🎉
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {orderIndex > 0 ? (
              <>
                Você é a <span className="font-bold text-blue-700">#{orderIndex}ª pessoa</span> a concluir a questão de hoje.
              </>
            ) : (
              'Questão de hoje concluída com sucesso!'
            )}
          </p>
        </div>

        <button
          onClick={onOpenMural}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Ver Mural da Turma</span>
        </button>
      </div>

      {/* Indicadores Principais: Ofensiva e Total */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 my-5">
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Ofensiva Ativa
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none mt-0.5">
              {streakDays} {streakDays === 1 ? 'Dia' : 'Dias'}
            </div>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Total Acumulado
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none mt-0.5">
              {currentTotal} {currentTotal === 1 ? 'Questão' : 'Questões'}
            </div>
          </div>
        </div>
      </div>

      {/* Bloco de Metas e Conquistas de Acordo com o Cenário */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        {/* CENÁRIO 1: PRIMEIRA QUESTÃO FEITA */}
        {isFirstQuestion && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                <span>Sensacional! 1ª questão no bolso e chama acesa! 🔥</span>
              </div>
              <p className="text-xs text-amber-950 font-medium mt-1 leading-relaxed">
                <strong>Sua primeira missão:</strong> manter a constância nos próximos dias até bater <strong>3 questões resolvidas no total</strong>.
              </p>
              <p className="text-[11px] text-amber-800/90 mt-1 font-semibold">
                📌 Amanhã tem mais uma no grupo do WhatsApp. Venha garantir a sua 2ª!
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>🎯 Sua Meta: Bater 3 Questões</span>
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px]">
                  1 de 3 concluídas
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1ª (Hoje) ✓</span>
                </div>
                <div className="bg-white border border-dashed border-slate-300 text-slate-500 font-medium py-1.5 px-2 rounded-lg">
                  <span>2ª (Amanhã)</span>
                </div>
                <div className="bg-white border border-dashed border-slate-300 text-slate-400 font-medium py-1.5 px-2 rounded-lg">
                  <span>3ª (Em breve)</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5 mt-1.5">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-700"
                  style={{ width: '33.3%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CENÁRIO 2: MARCO DESBLOQUEADO NESTA RESOLUÇÃO */}
        {!isFirstQuestion && isMilestoneJustUnlocked && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-100/70 border border-amber-300/80 rounded-lg">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base">
                <Trophy className="w-5 h-5 text-amber-600 fill-amber-500 shrink-0" />
                <span>MARCO DE {unlockedTarget} QUESTÕES CONQUISTADO! 🎉</span>
              </div>
              <p className="text-xs text-amber-800 font-medium mt-1">
                {celebrationMessage || 'Você construiu um hábito forte de estudo!'}
              </p>
            </div>

            {/* Apresentação do Próximo Desafio */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  Sua Próxima Meta: Bater {nextTarget} Questões
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
              <p className="text-[11px] text-slate-600 mt-1.5 font-medium leading-tight">
                {nextMilestonePrompt || `Faltam ${remaining} ${remaining === 1 ? 'questão' : 'questões'} para o próximo nível!`}
              </p>
            </div>
          </div>
        )}

        {/* CENÁRIO 3: DIA REGULAR DE CAMINHADA */}
        {!isFirstQuestion && !isMilestoneJustUnlocked && (
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                {target === 3 ? 'Sua Meta: Bater 3 Questões' : `Rumo ao Marco de ${target} Questões`}
              </span>
              <span className="text-blue-700 font-extrabold">
                {currentTotal}/{target}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {target === 3 && remaining === 1 ? (
                <>
                  <span className="font-bold text-blue-700">Falta só 1 para bater a meta de 3!</span>{' '}
                  <span>Amanhã mando a próxima no WhatsApp. Não perca para fechar suas 3!</span>
                </>
              ) : remaining === 1 ? (
                <>
                  Falta apenas <strong className="text-blue-700 font-bold">1 questão</strong> para desbloquear o Marco de {target} Questões! Amanhã tem mais no WhatsApp.
                </>
              ) : (
                <>
                  Faltam <strong className="text-blue-700 font-bold">{remaining} questões</strong> para você bater a meta de {target} questões.
                </>
              )}
            </p>

            {/* Barra de Progresso */}
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, progressPercentage)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
