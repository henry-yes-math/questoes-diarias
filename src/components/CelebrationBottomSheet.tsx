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
  Shield,
  Share2,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MilestoneInfo } from '../types';
import { generateStudentInviteWhatsAppUrl, DEFAULT_WHATSAPP_GROUP_URL } from '../utils/gamification';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  orderIndex: number;
  streakDays: number;
  streakShields?: number;
  whatsappGroupUrl?: string;
  milestoneInfo: MilestoneInfo;
  onOpenMural: () => void;
  onScrollToHints?: () => void;
  wasShieldUsed?: boolean;
  shieldsUsed?: number;
  earnedNewShield?: boolean;
}

export const CelebrationBottomSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  studentName,
  orderIndex,
  streakDays,
  streakShields = 0,
  whatsappGroupUrl,
  milestoneInfo,
  onOpenMural,
  onScrollToHints,
  wasShieldUsed,
  shieldsUsed = 1,
  earnedNewShield,
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
    nextMilestonePrompt,
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
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resposta correta</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  PARABÉNS, {studentName.toUpperCase()}! 🎉
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
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

            {/* Avisos de Protetor de Ofensiva */}
            {wasShieldUsed && (
              <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-xs text-blue-900 shadow-2xs">
                <Shield className="w-4 h-4 text-blue-600 fill-blue-500/20 shrink-0" />
                <span>
                  <strong className="font-bold text-blue-950">
                    {shieldsUsed >= 2 ? '2 Protetores de Ofensiva Acionados:' : 'Protetor de Ofensiva Acionado:'}
                  </strong>{' '}
                  {shieldsUsed >= 2
                    ? 'Suas faltas dos últimos 2 dias foram salvas pelos seus 2 protetores e sua chama continua viva!'
                    : 'Sua falta anterior foi salva pelo seu protetor e sua chama continua viva!'}
                </span>
              </div>
            )}
            {earnedNewShield && (
              <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-xs text-emerald-900 shadow-2xs">
                <Shield className="w-4 h-4 text-emerald-600 fill-emerald-500/20 shrink-0" />
                <span>
                  <strong className="font-bold text-emerald-950">Novo Protetor Desbloqueado! 🛡️</strong> Parabéns pela consistência, você ganhou +1 protetor de reserva!
                </span>
              </div>
            )}

            {/* Linha Divisória */}
            <div className="border-t border-slate-200/80" />

            {/* Bloco de Metas da Turma */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4">
              {/* CENÁRIO 1: PRIMEIRA QUESTÃO FEITA */}
              {isFirstQuestion && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs sm:text-sm">
                      <span className="text-base leading-none">🔥</span>
                      <span>1ª questão no bolso! Sua meta agora é chegar a 3 resolvidas.</span>
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed pl-6">
                      A 2ª questão chega amanhã no grupo do WhatsApp.
                    </p>
                  </div>

                  {/* Mini Trilha Visual das 3 Primeiras Questões */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>🎯 Sua Meta: Bater 3 Questões</span>
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px]">
                        1 de 3 concluídas
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                      <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>1ª (Hoje)</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-extrabold">Concluída ✓</span>
                      </div>
                      <div className="bg-white border border-dashed border-emerald-300/80 text-slate-700 font-medium py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5">
                        <span className="font-semibold text-slate-800">2ª (Amanhã)</span>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5 fill-emerald-600 shrink-0" viewBox="0 0 24 24">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23z"/>
                          </svg>
                          <span>WhatsApp</span>
                        </span>
                      </div>
                      <div className="bg-white border border-dashed border-slate-300 text-slate-500 font-medium py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5">
                        <span className="text-slate-600">3ª (Em breve)</span>
                        <span className="text-[10px] text-emerald-600/90 font-medium flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5 fill-emerald-600 shrink-0" viewBox="0 0 24 24">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23z"/>
                          </svg>
                          <span>WhatsApp</span>
                        </span>
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

                  {/* Chamada para o Grupo Oficial do WhatsApp para receber a 2ª questão */}
                  <div className="pt-1">
                    <a
                      href={whatsappGroupUrl || DEFAULT_WHATSAPP_GROUP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
                    >
                      <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23z"/>
                      </svg>
                      <span>Entrar no Grupo para garantir a 2ª</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
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
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
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
                        Falta apenas <strong className="text-blue-700 font-bold">1 questão</strong> para bater a meta de {target} questões! Amanhã tem mais no WhatsApp.
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

            {/* Card de Bônus: Ganhe 1 Escudo Anti-Falta via WhatsApp (Apenas se streakShields < 2 e não for Dia 1) */}
            {!isFirstQuestion && streakShields < 2 && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>BÔNUS: +1 ESCUDO ANTI-FALTA</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800">
                    {streakShields}/2 ativos
                  </span>
                </div>

                <a
                  href={generateStudentInviteWhatsAppUrl(studentName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg transition-all shadow-2xs flex items-center justify-center gap-2 text-xs sm:text-sm text-center group cursor-pointer"
                >
                  <span className="text-sm leading-none">🟢</span>
                  <span>Desafiar Amigo no WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <p className="text-[11px] text-center text-emerald-900/80 font-medium leading-tight">
                  Ativado assim que seu amigo concluir a questão de hoje.
                </p>
              </div>
            )}

            {/* Ações Inferiores */}
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
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
